# scrapers/bayut_scraper.py
# Scraper for Bayut — UAE, Saudi Arabia, Qatar
# Uses their public GraphQL API

import logging
from scrapers.base_scraper import BaseScraper, RawListing

logger = logging.getLogger(__name__)

CITY_CONFIG = {
    "Dubai":       {"country": "AE", "location_id": "dubai"},
    "Abu Dhabi":   {"country": "AE", "location_id": "abu-dhabi"},
    "Riyadh":      {"country": "SA", "location_id": "riyadh"},
    "Doha":        {"country": "QA", "location_id": "doha"},
}

GRAPHQL_URL = "https://www.bayut.com/api/graphql/"

QUERY = """
query SearchListings($locationSlug: String!, $purpose: String!, $page: Int!) {
  searchListings(
    locationSlug: $locationSlug
    purpose: $purpose
    page: $page
    pageSize: 20
    residentialTypes: [apartment, villa]
  ) {
    listings {
      id
      title
      price
      area
      rooms
      baths
      location { name lat lng }
      purpose
      category { nameSingular }
      floorNumber
      completionDetails { completionYear }
    }
  }
}
"""


class BayutScraper(BaseScraper):

    SOURCE_NAME = "bayut"
    REQUEST_DELAY = 2.0

    async def fetch_listings(self, city: str, **kwargs) -> list[RawListing]:
        config = CITY_CONFIG.get(city)
        if not config:
            return []

        listings = []

        for purpose, listing_type in [("for-sale", "sale"), ("for-rent", "rent")]:
            try:
                response = await self.client.post(
                    GRAPHQL_URL,
                    json={
                        "query": QUERY,
                        "variables": {
                            "locationSlug": config["location_id"],
                            "purpose": purpose,
                            "page": 1,
                        }
                    },
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code != 200:
                    logger.warning(f"Bayut {city} returned {response.status_code}")
                    continue

                data = response.json()
                raw = data.get("data", {}).get("searchListings", {}).get("listings", [])

                for item in raw:
                    try:
                        location = item.get("location", {})
                        year = None
                        completion = item.get("completionDetails")
                        if completion:
                            year = completion.get("completionYear")

                        listings.append(RawListing(
                            external_id=self._make_external_id("bayut", str(item["id"])),
                            source=self.SOURCE_NAME,
                            country_code=config["country"],
                            city=city,
                            district=location.get("name"),
                            address=None,
                            lat=location.get("lat"),
                            lng=location.get("lng"),
                            property_type=item.get("category", {}).get("nameSingular", "apartment").lower(),
                            listing_type=listing_type,
                            price=float(item.get("price", 0)),
                            currency="AED",
                            area_sqm=float(item.get("area", 0)) * 0.0929,  # sqft to sqm
                            bedrooms=item.get("rooms"),
                            bathrooms=item.get("baths"),
                            floor=item.get("floorNumber"),
                            year_built=year,
                            description=item.get("title"),
                            url=f"https://www.bayut.com/property/details-{item['id']}.html",
                        ))
                    except (KeyError, TypeError, ValueError) as e:
                        logger.debug(f"Parse error: {e}")
                        continue

                logger.info(f"Bayut {city} {listing_type}: {len(raw)} listings")

            except Exception as e:
                logger.error(f"Bayut error {city}: {e}")

        return listings