# backend/routers/auth.py
import asyncio

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from backend.config import settings
from backend.deps import USER_COLUMNS, get_current_user, get_db
from backend.models.user import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateUserRequest,
    UserResponse,
)
from backend.services.auth import create_token, hash_password, verify_password
from backend.services.currency import CurrencyService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _token_for(user: UserResponse) -> TokenResponse:
    token = create_token(user.id, settings.JWT_SECRET, settings.JWT_EXPIRE_MINUTES)
    return TokenResponse(access_token=token, user=user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db=Depends(get_db)):
    # PBKDF2 is deliberately slow — keep it off the event loop
    password_hash = await asyncio.to_thread(hash_password, body.password)
    try:
        async with db.acquire() as conn:
            row = await conn.fetchrow(
                f"INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) "
                f"RETURNING {USER_COLUMNS}",
                body.email, password_hash, body.full_name,
            )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="An account with this e-mail already exists")
    return _token_for(UserResponse(**dict(row)))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db=Depends(get_db)):
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT {USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
            body.email.strip(),
        )
    valid = row is not None and await asyncio.to_thread(verify_password, body.password, row["password_hash"])
    if not valid:
        raise HTTPException(status_code=401, detail="Wrong e-mail or password")
    user = dict(row)
    user.pop("password_hash")
    return _token_for(UserResponse(**user))


@router.get("/me", response_model=UserResponse)
async def me(user: UserResponse = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UpdateUserRequest, user: UserResponse = Depends(get_current_user), db=Depends(get_db)):
    currency = body.preferred_currency.upper() if body.preferred_currency else None
    if currency and currency not in CurrencyService.SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=422, detail=f"Unsupported currency: {currency}")
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE users SET full_name = COALESCE($2, full_name), "
            f"preferred_currency = COALESCE($3, preferred_currency) "
            f"WHERE id = $1::uuid RETURNING {USER_COLUMNS}",
            user.id, body.full_name, currency,
        )
    return UserResponse(**dict(row))
