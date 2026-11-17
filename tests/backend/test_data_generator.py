from scrapers.data_generator import AZN_PER_USD, CITIES, MARKETS, generate_listing, generate_price_history


def test_all_markets_are_in_azerbaijan():
    assert "Baku" in CITIES
    for market in MARKETS:
        listing = generate_listing(market, "sale")
        assert listing["country_code"] == "AZ"
        assert listing["district"] in market["districts"]
        assert abs(listing["lat"] - market["lat"]) <= market["spread"] + 1e-9


def test_prices_follow_market_ranges():
    for market in MARKETS:
        for listing_type in ("sale", "rent"):
            low, high = market[listing_type]
            for _ in range(20):
                item = generate_listing(market, listing_type)
                ppsqm_azn = item["price_usd"] * AZN_PER_USD / item["area_sqm"]
                # rounding of the total price can move price/m² slightly
                assert low * 0.97 <= ppsqm_azn <= high * 1.03


def test_price_history_only_for_older_sale_listings():
    market = MARKETS[0]
    for _ in range(50):
        item = generate_listing(market, "rent")
        assert generate_price_history(item, 0.03) == []
    for _ in range(50):
        item = generate_listing(market, "sale")
        for _, recorded_at, price in generate_price_history(item, 0.03):
            assert recorded_at > item["listed_at"]
            assert price > 0
