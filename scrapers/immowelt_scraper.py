# scrapers/immowelt_scraper.py
# Scraper for Immowelt — Germany, Austria, Switzerland
# Uses their public search API (no auth required for basic search)

import logging
import re
from typing import Optional
from scrapers.base_scraper import BaseScraper, RawListing

logger = logging.getLogger(__name__)

CITY_CONFIG = {
    "Berlin":   {"country": "DE", "immowelt_id": "berlin"},
    "Munich":   {"country": "DE", "immowelt_id": "muenchen"},
    "Hamburg":  {"country": "DE", "immowelt_id": "hamburg"},
    "Frankfurt":{"country": "DE", "immowelt_id": "frankfurt-am-main"},
    "Vienna":   {"country": "AT", "immowelt_id": "wien"},
    "Zurich":   {"country": "CH", "immowelt_id": "zuerich"},
}


class ImmoweltScraper(BaseScraper):

    SOURCE_NAME = "immowelt"
    REQUEST_DELAY = 3.0

    async def fetch_listings(self, city: str, **kwargs) -> list[RawListing]:
        config = CITY_CONFIG.get(city)
        if not config:
            logger.warning(f"City {city} not configured for Immowelt")
            return []

        listings = []

        # Fetch both sale and rent
        for listing_type, iw_type in [("sale", "kaufen"), ("rent", "mieten")]:
            try:
                url = (
                    f"https://www.immowelt.de/liste/{config['immowelt_id']}"
                    f"/wohnungen/{iw_type}"
                    f"?sort=relevanz&pg=1"
                )
                response = await self.client.get(url)

                if response.status_code != 200:
                    logger.warning(f"Immowelt returned {response.status_code} for {city}")
                    continue

                parsed = self._parse_html(
                    response.text, city, config["country"], listing_type
                )
                listings.extend(parsed)
                logger.info(f"Immowelt {city} {listing_type}: {len(parsed)} listings")

            except Exception as e:
                logger.error(f"Immowelt error for {city}: {e}")

        return listings

    def _parse_html(
        self, html: str, city: str, country: str, listing_type: str
    ) -> list[RawListing]:
        """
        Parse Immowelt HTML response.
        Extracts price, area, rooms from structured data.
        """
        listings = []

        # Extract JSON-LD structured data
        json_pattern = r'"price":\s*(\d+)'
        area_pattern = r'"floorSize":\s*{\s*"value":\s*([\d.]+)'
        id_pattern = r'data-estateid="(\d+)"'
        rooms_pattern = r'"numberOfRooms":\s*([\d.]+)'
        district_pattern = r'"addressLocality":\s*"([^"]+)"'

        ids = re.findall(id_pattern, html)
        prices = re.findall(json_pattern, html)
        areas = re.findall(area_pattern, html)
        rooms = re.findall(rooms_pattern, html)
        districts = re.findall(district_pattern, html)

        for i, estate_id in enumerate(ids[:20]):  # max 20 per page
            try:
                price = float(prices[i]) if i < len(prices) else None
                if not price or price < 1000:
                    continue

                area = float(areas[i]) if i < len(areas) else None
                bedrooms = max(0, int(float(rooms[i])) - 1) if i < len(rooms) else None
                district = districts[i] if i < len(districts) else None

                listings.append(RawListing(
                    external_id=self._make_external_id("immowelt", estate_id),
                    source=self.SOURCE_NAME,
                    country_code=country,
                    city=city,
                    district=district,
                    address=None,
                    lat=None,
                    lng=None,
                    property_type="apartment",
                    listing_type=listing_type,
                    price=price,
                    currency="EUR",
                    area_sqm=area,
                    bedrooms=bedrooms,
                    bathrooms=None,
                    floor=None,
                    year_built=None,
                    description=None,
                    url=f"https://www.immowelt.de/expose/{estate_id}",
                ))
            except (IndexError, ValueError) as e:
                logger.debug(f"Parse error for listing {i}: {e}")
                continue

        return listings