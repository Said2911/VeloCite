# scrapers/bina_az_scraper.py
# EXPERIMENTAL scraper for bina.az — Azerbaijan's largest property portal.
#
# Status: written without access to the live site, so the URL patterns and the
# regular expressions below are assumptions that must be checked against the
# real HTML before use (open a list page and an item page, "View source", and
# adjust LIST_URL / the *_RE patterns). It is disabled by default: it only runs
# with `docker compose --profile scrapers up`.
#
# Before enabling it, read bina.az's terms of use and robots.txt, and keep the
# request rate low (REQUEST_DELAY).

import asyncio
import logging
import re
from typing import Optional

from scrapers.base_scraper import BaseScraper, RawListing

logger = logging.getLogger(__name__)

BASE_URL = "https://bina.az"

# city name in VeloCite → (slug on bina.az, fallback coordinates)
CITY_CONFIG = {
    "Baku":    {"slug": "baki",     "lat": 40.4093, "lng": 49.8671},
    "Sumgait": {"slug": "sumqayit", "lat": 40.5897, "lng": 49.6686},
    "Ganja":   {"slug": "gence",    "lat": 40.6828, "lng": 46.3606},
}

# {slug}/{purpose}/menziller — purpose: alqi-satqi (sale) or kiraye (rent)
LIST_URL = BASE_URL + "/{slug}/{purpose}/menziller?page={page}"
PURPOSES = {"sale": "alqi-satqi", "rent": "kiraye"}

ITEM_LINK_RE = re.compile(r'href="/items/(\d+)"')
PRICE_RE = re.compile(r"(\d[\d\s]{2,})\s*(?:AZN|₼|azn)", re.IGNORECASE)
AREA_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*m²")
ROOMS_RE = re.compile(r"Otaq sayı\D{0,40}?(\d+)", re.IGNORECASE)
FLOOR_RE = re.compile(r"Mərtəbə\D{0,40}?(\d+)\s*/\s*\d+", re.IGNORECASE)
LAT_RE = re.compile(r'data-lat(?:itude)?="(-?\d+\.\d+)"')
LNG_VALUE_RE = re.compile(r'data-(?:lng|lon|longitude)="(-?\d+\.\d+)"')
DISTRICT_RE = re.compile(r"([A-ZÇƏĞİÖŞÜ][\wçəğıöşü]+)\s+r\.", re.UNICODE)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def _to_number(text: str) -> Optional[float]:
    try:
        return float(text.replace(" ", "").replace(" ", "").replace(",", "."))
    except (ValueError, AttributeError):
        return None


def parse_list_page(html: str) -> list[str]:
    """Item ids found on a search results page (order kept, duplicates removed)."""
    return list(dict.fromkeys(ITEM_LINK_RE.findall(html)))


def parse_item_page(html: str) -> dict:
    """Extract the fields VeloCite needs from an item page. Missing fields are None."""
    price = PRICE_RE.search(html)
    area = AREA_RE.search(html)
    rooms = ROOMS_RE.search(html)
    floor = FLOOR_RE.search(html)
    lat = LAT_RE.search(html)
    lng = LNG_VALUE_RE.search(html)
    district = DISTRICT_RE.search(html)
    title = TITLE_RE.search(html)
    return {
        "price": _to_number(price.group(1)) if price else None,
        "area_sqm": _to_number(area.group(1)) if area else None,
        "rooms": int(rooms.group(1)) if rooms else None,
        "floor": int(floor.group(1)) if floor else None,
        "lat": float(lat.group(1)) if lat else None,
        "lng": float(lng.group(1)) if lng else None,
        "district": district.group(1) if district else None,
        "title": title.group(1).strip() if title else None,
    }


class BinaAzScraper(BaseScraper):

    SOURCE_NAME = "bina_az"
    REQUEST_DELAY = 3.0
    MAX_PAGES = 2          # per city and purpose — keep it small
    MAX_ITEMS = 40         # item pages fetched per city and purpose

    async def fetch_listings(self, city: str, **kwargs) -> list[RawListing]:
        config = CITY_CONFIG.get(city)
        if not config:
            logger.warning(f"City {city} is not configured for bina.az")
            return []

        listings: list[RawListing] = []
        for listing_type, purpose in PURPOSES.items():
            item_ids: list[str] = []
            for page in range(1, self.MAX_PAGES + 1):
                url = LIST_URL.format(slug=config["slug"], purpose=purpose, page=page)
                response = await self.client.get(url)
                if response.status_code != 200:
                    logger.warning(f"bina.az returned {response.status_code} for {url}")
                    break
                found = parse_list_page(response.text)
                if not found:
                    logger.warning(f"No items found on {url} — check ITEM_LINK_RE")
                    break
                item_ids.extend(found)
                await asyncio.sleep(self.REQUEST_DELAY)

            for item_id in list(dict.fromkeys(item_ids))[: self.MAX_ITEMS]:
                listing = await self._fetch_item(item_id, city, config, listing_type)
                if listing:
                    listings.append(listing)
                await asyncio.sleep(self.REQUEST_DELAY)

            logger.info(f"bina.az {city} {listing_type}: {len(listings)} parsed so far")
        return listings

    async def _fetch_item(self, item_id: str, city: str, config: dict, listing_type: str) -> Optional[RawListing]:
        url = f"{BASE_URL}/items/{item_id}"
        try:
            response = await self.client.get(url)
            if response.status_code != 200:
                return None
            data = parse_item_page(response.text)
        except Exception as e:
            logger.debug(f"bina.az item {item_id} failed: {e}")
            return None

        if not data["price"] or not data["area_sqm"]:
            return None

        rooms = data["rooms"]
        return RawListing(
            external_id=self._make_external_id(self.SOURCE_NAME, item_id),
            source=self.SOURCE_NAME,
            country_code="AZ",
            city=city,
            district=data["district"],
            address=None,
            # fall back to the city centre when the page has no map coordinates
            lat=data["lat"] or config["lat"],
            lng=data["lng"] or config["lng"],
            property_type="apartment",
            listing_type=listing_type,
            price=data["price"],
            currency="AZN",
            area_sqm=data["area_sqm"],
            bedrooms=max(0, rooms - 1) if rooms else None,
            bathrooms=None,
            floor=data["floor"],
            year_built=None,
            description=data["title"],
            url=url,
        )
