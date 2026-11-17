# backend/services/currency.py
# Currency conversion with live rates, caching and an offline fallback

import json
import logging

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

# Approximate USD-based rates, used when the live API is unreachable.
# (1 USD = X units of currency)
FALLBACK_RATES: dict[str, float] = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 150.0, "AED": 3.6725,
    "CHF": 0.88, "AUD": 1.52, "CAD": 1.37, "SGD": 1.34, "HKD": 7.81,
    "NOK": 10.6, "SEK": 10.4, "BRL": 5.4, "TRY": 34.0, "CNY": 7.2,
    "INR": 84.0, "MXN": 18.5, "ZAR": 18.2, "KRW": 1380.0, "SAR": 3.75,
    "AZN": 1.7,
}


class CurrencyService:
    """
    Fetches live FX rates from exchangerate-api.com.
    Rates are cached for 15 minutes; if the API is down, approximate
    fallback rates are used so search never fails because of FX.
    """

    SUPPORTED_CURRENCIES = {
        "USD": "$",   "EUR": "€",   "GBP": "£",
        "JPY": "¥",   "AED": "د.إ", "CHF": "Fr",
        "AUD": "A$",  "CAD": "C$",  "SGD": "S$",
        "HKD": "HK$", "NOK": "kr",  "SEK": "kr",
        "BRL": "R$",  "TRY": "₺",   "CNY": "¥",
        "INR": "₹",   "MXN": "$",   "ZAR": "R",
        "KRW": "₩",   "SAR": "﷼",   "AZN": "₼",
    }

    CACHE_KEY = "fx:rates:USD"

    def __init__(self, cache):
        self.cache = cache

    async def _fetch_live_rates(self) -> dict:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.EXCHANGE_RATE_API_URL)
            response.raise_for_status()
            rates = response.json()["rates"]
        if not isinstance(rates, dict) or "EUR" not in rates:
            raise ValueError("Unexpected FX API response")
        return rates

    async def _get_rates(self) -> dict:
        """Get all USD-based rates: cache → live API → fallback table."""
        cached = await self.cache.get(self.CACHE_KEY)
        if cached:
            return json.loads(cached)

        try:
            rates = await self._fetch_live_rates()
            ttl = settings.CURRENCY_CACHE_TTL
        except Exception as e:
            logger.warning("FX API unavailable (%s) — using fallback rates", e)
            rates = FALLBACK_RATES
            ttl = 60  # retry the live API soon

        await self.cache.setex(self.CACHE_KEY, ttl, json.dumps(rates))
        return rates

    async def get_rate(self, from_currency: str, to_currency: str) -> float:
        """Get exchange rate between any two currencies."""
        from_currency, to_currency = from_currency.upper(), to_currency.upper()
        if from_currency == to_currency:
            return 1.0

        rates = await self._get_rates()
        usd_to_target = rates.get(to_currency) or FALLBACK_RATES.get(to_currency, 1.0)
        usd_to_source = rates.get(from_currency) or FALLBACK_RATES.get(from_currency, 1.0)
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
        return self.SUPPORTED_CURRENCIES.get(currency_code.upper(), currency_code)

    def is_supported(self, currency_code: str) -> bool:
        """Check if currency is supported."""
        return currency_code.upper() in self.SUPPORTED_CURRENCIES
