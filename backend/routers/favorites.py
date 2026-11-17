# backend/routers/favorites.py
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.deps import get_cache, get_current_user, get_db
from backend.models.listing import ListingResponse
from backend.models.user import UserResponse
from backend.services.listings import ListingService, parse_uuid

router = APIRouter(prefix="/api/v1/favorites", tags=["favorites"])


@router.get("", response_model=list[ListingResponse])
async def list_favorites(
    currency: str = Query("AZN", min_length=3, max_length=3),
    user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
    cache=Depends(get_cache),
):
    async with db.acquire() as conn:
        rows = await conn.fetch(
            "SELECT listing_id::text AS id FROM favorites WHERE user_id = $1::uuid ORDER BY created_at DESC",
            user.id,
        )
    return await ListingService(db, cache).get_by_ids([r["id"] for r in rows], currency)


@router.get("/ids", response_model=list[str])
async def favorite_ids(user: UserResponse = Depends(get_current_user), db=Depends(get_db)):
    """Lightweight list of saved listing ids (to render heart icons)."""
    async with db.acquire() as conn:
        rows = await conn.fetch("SELECT listing_id::text AS id FROM favorites WHERE user_id = $1::uuid", user.id)
    return [r["id"] for r in rows]


@router.put("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_favorite(listing_id: str, user: UserResponse = Depends(get_current_user), db=Depends(get_db)):
    listing_uuid = parse_uuid(listing_id)
    if listing_uuid is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    async with db.acquire() as conn:
        exists = await conn.fetchval("SELECT 1 FROM listings WHERE id = $1::uuid", listing_uuid)
        if not exists:
            raise HTTPException(status_code=404, detail="Listing not found")
        await conn.execute(
            "INSERT INTO favorites (user_id, listing_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING",
            user.id, listing_uuid,
        )


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(listing_id: str, user: UserResponse = Depends(get_current_user), db=Depends(get_db)):
    listing_uuid = parse_uuid(listing_id)
    if listing_uuid is None:
        return
    async with db.acquire() as conn:
        await conn.execute(
            "DELETE FROM favorites WHERE user_id = $1::uuid AND listing_id = $2::uuid", user.id, listing_uuid
        )
