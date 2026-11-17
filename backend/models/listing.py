# backend/models/listing.py
# Pydantic models for request validation and response formatting

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

SortOption = Literal["relevance", "value", "price_asc", "price_desc", "newest", "area_desc", "ppsqm_asc"]
PropertyType = Literal["apartment", "house", "villa", "land", "commercial"]
ListingType = Literal["sale", "rent"]


class SearchParams(BaseModel):
    """Incoming search request parameters."""

    # Location
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    city: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(None, ge=0.1, le=500)

    # Property filters
    property_type: Optional[PropertyType] = None
    listing_type: ListingType = "sale"
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    min_area: Optional[float] = Field(None, ge=0)
    max_area: Optional[float] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0, le=20)

    # Display
    currency: str = Field("AZN", min_length=3, max_length=3)
    sort: SortOption = "value"
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class ListingResponse(BaseModel):
    """A single listing returned to the frontend."""

    id: str
    country_code: str
    city: str
    district: Optional[str] = None
    address: Optional[str] = None

    # Coordinates
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Property details
    property_type: str
    listing_type: str
    area_sqm: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floor: Optional[int] = None
    year_built: Optional[int] = None

    # Pricing (converted to user's currency)
    price_usd: float
    price_display: float
    price_per_sqm_display: Optional[float] = None
    currency: str
    currency_symbol: str

    # Analytics scores
    value_score: Optional[float] = None
    market_position: Optional[str] = None

    # Metadata
    source: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    listed_at: Optional[datetime] = None


class MarketSummary(BaseModel):
    """Price-per-m² statistics for a set of listings (in the display currency)."""

    currency: str
    median_price_sqm: float
    avg_price_sqm: float
    listings_analyzed: int
    price_distribution: dict[str, float]   # p10 … p90
    bedroom_breakdown: dict[str, float]    # bedrooms → median price/m²


class SearchResponse(BaseModel):
    """Full search response with listings + market context."""

    listings: list[ListingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    sort: str
    market_summary: Optional[MarketSummary] = None


class PricePoint(BaseModel):
    date: datetime
    price_display: float


class ListingDetailResponse(BaseModel):
    """One listing with its market context."""

    listing: ListingResponse
    segment: str                                # "district" or "city"
    percentile: Optional[float] = None          # 0 = cheapest per m² in its segment
    market: Optional[MarketSummary] = None      # same segment, same type, sale or rent
    comparables: list[ListingResponse]
    price_history: list[PricePoint]


class DistrictOverview(BaseModel):
    district: str
    listings: int
    median_sale_price_sqm: Optional[float] = None
    median_rent_price_sqm: Optional[float] = None


class MarketOverview(BaseModel):
    """Aggregated stats for one city (values in the display currency)."""

    country_code: str
    city: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    listings: int
    sale_listings: int
    rent_listings: int
    median_sale_price_sqm: Optional[float] = None
    median_rent_price_sqm: Optional[float] = None
    avg_value_score: Optional[float] = None
    price_trend_30d: Optional[float] = None     # % change of sale prices
    currency: str
    districts: list[DistrictOverview] = []


class MarketsResponse(BaseModel):
    total_listings: int
    total_cities: int
    total_districts: int
    currency: str
    markets: list[MarketOverview]
