# backend/models/listing.py
# Pydantic models for request validation and response formatting

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SearchParams(BaseModel):
    """Incoming search request parameters."""

    # Location
    country_code: Optional[str] = Field(None, max_length=2)
    city: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(None, ge=0.1, le=500)

    # Property filters
    property_type: Optional[str] = None
    listing_type: str = "sale"
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = None
    min_area: Optional[float] = Field(None, ge=0)
    max_area: Optional[float] = None
    bedrooms: Optional[int] = Field(None, ge=0, le=20)

    # Display
    currency: str = "USD"
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class ListingResponse(BaseModel):
    """A single listing returned to the frontend."""

    id: str
    country_code: str
    city: str
    district: Optional[str]
    address: Optional[str]

    # Coordinates
    lat: float
    lng: float

    # Property details
    property_type: str
    listing_type: str
    area_sqm: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    floor: Optional[int]
    year_built: Optional[int]

    # Pricing (converted to user's currency)
    price_usd: float
    price_display: float
    price_per_sqm_display: Optional[float]
    currency: str

    # Analytics scores
    value_score: Optional[float]
    market_position: Optional[str]

    # Metadata
    listed_at: datetime


class MarketSummary(BaseModel):
    """Market statistics for a city/property type segment."""

    median_price_sqm: float
    avg_price_sqm: float
    listings_analyzed: int
    price_distribution: dict
    bedroom_breakdown: dict


class SearchResponse(BaseModel):
    """Full search response with listings + market context."""

    listings: list[ListingResponse]
    total: int
    page: int
    page_size: int
    market_summary: Optional[MarketSummary]