# backend/services/currency.py
# Real-time currency conversion with Redis caching

import httpx
import json
from backend.config import settings


class CurrencyService:
    """
    Fetches live FX rates from exchangerate-api.com.
    Rates are cached in Redis for 15 minutes to avoid hammering the API.
    """

    SUPPORTED_CURRENCIES = {
        "USD": "$",   "EUR": "€",   "GBP": "£",
        "JPY": "¥",   "AED": "د.إ", "CHF": "Fr",
        "AUD": "A$",  "CAD": "C$",  "SGD": "S$",
        "HKD": "HK$", "NOK": "kr",  "SEK": "kr",
        "BRL": "R$",  "TRY": "₺",   "CNY": "¥",
        "INR": "₹",   "MXN": "$",   "ZAR": "R",
        "KRW": "₩",   "SAR": "﷼",
    }

    def __init__(self, redis_client):
        self.redis = redis_client

    async def _get_rates(self) -> dict:
        """Get all USD-based rates, from cache or API."""
        cache_key = "fx:rates:USD"
        cached = await self.redis.get(cache_key)

        if cached:
            return json.loads(cached)

        # Fetch fresh rates
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.EXCHANGE_RATE_API_URL)
            data = response.json()
            rates = data["rates"]

        # Cache for 15 minutes
        await self.redis.setex(
            cache_key,
            settings.CURRENCY_CACHE_TTL,
            json.dumps(rates)
        )
        return rates

    async def get_rate(self, from_currency: str, to_currency: str) -> float:
        """Get exchange rate between any two currencies."""
        if from_currency == to_currency:
            return 1.0

        rates = await self._get_rates()
        usd_to_target = rates.get(to_currency, 1.0)
        usd_to_source = rates.get(from_currency, 1.0)
        return usd_to_target / usd_to_source

    async def to_usd(self, amount: float, from_currency: str) -> float:
        """Convert any currency amount to USD."""
        rate = await self.get_rate(from_currency, "USD")
        return round(amount * rate, 2)

    async def from_usd(self, amount_usd: float, to_currency: str) -> float:
        """Convert USD amount to target currency."""
        rate = await self.get_rate("USD", to_currency)
        return round(amount_usd * rate, 2)

    def get_symbol(self, currency_code: str) -> str:
        """Get currency symbol (e.g. USD → $)."""
        return self.SUPPORTED_CURRENCIES.get(currency_code, currency_code)

    def is_supported(self, currency_code: str) -> bool:
        """Check if currency is supported."""
        return currency_code in self.SUPPORTED_CURRENCIES