import asyncio

from backend.cache import Cache
from backend.services.currency import FALLBACK_RATES, CurrencyService


def test_currency_falls_back_when_api_down(monkeypatch):
    async def scenario():
        fx = CurrencyService(Cache(None))

        async def offline():
            raise ConnectionError("offline")
        monkeypatch.setattr(fx, "_fetch_live_rates", offline)

        assert await fx.get_rate("USD", "AZN") == FALLBACK_RATES["AZN"]
        assert await fx.to_usd(FALLBACK_RATES["AZN"], "AZN") == 1.0
        assert await fx.get_rate("EUR", "EUR") == 1.0
        assert fx.get_symbol("azn") == "₼"
    asyncio.run(scenario())


def test_live_rates_are_cached(monkeypatch):
    calls = []

    async def scenario():
        fx = CurrencyService(Cache(None))

        async def live():
            calls.append(1)
            return {"USD": 1.0, "EUR": 0.9, "AZN": 1.7}
        monkeypatch.setattr(fx, "_fetch_live_rates", live)

        assert await fx.get_rate("USD", "EUR") == 0.9
        assert await fx.get_rate("USD", "AZN") == 1.7
    asyncio.run(scenario())
    assert len(calls) == 1
