# backend/routers/search.py
from fastapi import APIRouter, Depends, Query, Request
from typing import Optional

from backend.models.listing import SearchParams, SearchResponse
from backend.services.search import SearchService

router = APIRouter(prefix="/api/v1", tags=["search"])


def get_search_service(request: Request) -> SearchService:
    return SearchService(request.app.state.db_pool, request.app.state.cache)


@router.get("/search", response_model=SearchResponse)
async def search_listings(
    country_code: Optional[str] = Query(None, max_length=2),
    city: Optional[str] = Query(None),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: Optional[float] = Query(None, ge=0.1, le=500),
    property_type: Optional[str] = Query(None),
    listing_type: str = Query("sale"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None),
    min_area: Optional[float] = Query(None, ge=0),
    max_area: Optional[float] = Query(None),
    bedrooms: Optional[int] = Query(None, ge=0, le=20),
    currency: str = Query("USD", max_length=3),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: SearchService = Depends(get_search_service),
):
    params = SearchParams(
        country_code=country_code, city=city, lat=lat, lng=lng,
        radius_km=radius_km, property_type=property_type,
        listing_type=listing_type, min_price=min_price, max_price=max_price,
        min_area=min_area, max_area=max_area, bedrooms=bedrooms,
        currency=currency, page=page, page_size=page_size,
    )
    return await service.search(params)


@router.get("/currencies")
async def get_supported_currencies():
    from backend.services.currency import CurrencyService
    return CurrencyService.SUPPORTED_CURRENCIES

@router.post("/seed")
async def seed_data(request: Request):
    import sys
    sys.path.insert(0, '/app')
    from scrapers.data_generator import generate_and_insert
    from analytics.scoring import recompute_all_scores
    await generate_and_insert(80)
    scored = await recompute_all_scores(request.app.state.db_pool)
    await request.app.state.cache.delete_prefix("search:")
    return {"status": "done", "scored": scored}