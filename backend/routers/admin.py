# backend/routers/admin.py
# Maintenance endpoints — protected by the X-Admin-Token header (ADMIN_TOKEN env)

from fastapi import APIRouter, Depends, Query

from analytics.scoring import recompute_all_scores
from backend.deps import get_cache, get_db, require_admin
from backend.services.search import SEARCH_CACHE_PREFIX
from scrapers.data_generator import generate_and_insert

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])

CACHE_PREFIXES = (SEARCH_CACHE_PREFIX, "markets:")


async def _invalidate(cache) -> None:
    for prefix in CACHE_PREFIXES:
        await cache.delete_prefix(prefix)


@router.post("/seed")
async def seed(
    count_per_market: int = Query(80, ge=2, le=500),
    db=Depends(get_db),
    cache=Depends(get_cache),
):
    """Insert generated demo listings for Azerbaijan, then recompute value scores."""
    inserted = await generate_and_insert(count_per_market, pool=db)
    scored = await recompute_all_scores(db)
    await _invalidate(cache)
    return {"inserted": inserted, "scored": scored}


@router.post("/recompute-scores")
async def recompute(db=Depends(get_db), cache=Depends(get_cache)):
    scored = await recompute_all_scores(db)
    await _invalidate(cache)
    return {"scored": scored}
