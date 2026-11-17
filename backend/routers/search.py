# backend/routers/search.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.models.listing import (
    ListingType,
    PropertyType,
    SearchParams,
    SearchResponse,
    SortOption,
)
from backend.services.currency import CurrencyService
from backend.services.search import SEARCH_CACHE_PREFIX, SearchService

router = APIRouter(prefix="/api/v1", tags=["search"])


def get_search_service(request: Request) -> SearchService:
    return SearchService(request.app.state.db_pool, request.app.state.cache)


def _check_currency(currency: str) -> str:
    currency = currency.upper()
    if currency not in CurrencyService.SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=422, detail=f"Unsupported currency: {currency}")
    return currency


@router.get("/search", response_model=SearchResponse)
async def search_listings(
    country_code: Optional[str] = Query(None, min_length=2, max_length=2),
    city: Optional[str] = Query(None, max_length=100),
    district: Optional[str] = Query(None, max_length=100),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: Optional[float] = Query(None, ge=0.1, le=500),
    property_type: Optional[PropertyType] = Query(None),
    listing_type: ListingType = Query("sale"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_area: Optional[float] = Query(None, ge=0),
    max_area: Optional[float] = Query(None, ge=0),
    bedrooms: Optional[int] = Query(None, ge=0, le=20),
    currency: str = Query("AZN", min_length=3, max_length=3),
    sort: SortOption = Query("value"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: SearchService = Depends(get_search_service),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="min_price must not exceed max_price")
    if min_area is not None and max_area is not None and min_area > max_area:
        raise HTTPException(status_code=422, detail="min_area must not exceed max_area")

    params = SearchParams(
        country_code=country_code, city=city, district=district, lat=lat, lng=lng,
        radius_km=radius_km, property_type=property_type,
        listing_type=listing_type, min_price=min_price, max_price=max_price,
        min_area=min_area, max_area=max_area, bedrooms=bedrooms,
        currency=_check_currency(currency), sort=sort, page=page, page_size=page_size,
    )
    return await service.search(params)


@router.get("/currencies")
async def get_supported_currencies() -> dict[str, str]:
    return CurrencyService.SUPPORTED_CURRENCIES


@router.post("/seed")
async def seed_data(request: Request):
    import sys
    sys.path.insert(0, '/app')
    from scrapers.data_generator import generate_and_insert
    from analytics.scoring import recompute_all_scores
    await generate_and_insert(80)
    scored = await recompute_all_scores(request.app.state.db_pool)
    await request.app.state.cache.delete_prefix(SEARCH_CACHE_PREFIX)
    return {"status": "done", "scored": scored}
