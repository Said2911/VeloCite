from scrapers.base_scraper import BaseScraper
from scrapers.bina_az_scraper import parse_item_page, parse_list_page


def test_parse_list_page_keeps_order_and_dedupes():
    html = '<a href="/items/101">a</a><a href="/items/202">b</a><a href="/items/101">again</a>'
    assert parse_list_page(html) == ["101", "202"]


def test_parse_item_page_extracts_fields():
    html = """
        <title>3 otaqlı mənzil, Nəsimi r.</title>
        <div class="price">245 000 AZN</div>
        <div>Sahə 92 m²</div>
        <div>Otaq sayı</div><div>3</div>
        <div>Mərtəbə</div><div>7 / 16</div>
        <div id="map" data-lat="40.3835" data-lng="49.8290"></div>
    """
    data = parse_item_page(html)
    assert data["price"] == 245000
    assert data["area_sqm"] == 92
    assert data["rooms"] == 3
    assert data["floor"] == 7
    assert (data["lat"], data["lng"]) == (40.3835, 49.829)
    assert data["district"] == "Nəsimi"


def test_parse_item_page_missing_fields():
    data = parse_item_page("<html><body>nothing here</body></html>")
    assert data["price"] is None and data["area_sqm"] is None


def test_property_types_are_normalised():
    assert BaseScraper.normalize_property_type("Mənzil") == "apartment"
    assert BaseScraper.normalize_property_type("həyət evi") == "house"
    assert BaseScraper.normalize_property_type("bağ evi") == "villa"
    assert BaseScraper.normalize_property_type("something else") == "apartment"
