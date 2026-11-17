# backend/deps.py
# FastAPI dependencies shared by the routers

import hmac
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import settings
from backend.models.user import UserResponse
from backend.services.auth import decode_token

bearer = HTTPBearer(auto_error=False)

USER_COLUMNS = "id::text AS id, email, full_name, preferred_currency, created_at"


def get_db(request: Request):
    return request.app.state.db_pool


def get_cache(request: Request):
    return request.app.state.cache


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[UserResponse]:
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials, settings.JWT_SECRET)
    if payload is None:
        return None
    async with request.app.state.db_pool.acquire() as conn:
        row = await conn.fetchrow(f"SELECT {USER_COLUMNS} FROM users WHERE id = $1::uuid", payload["sub"])
    return UserResponse(**dict(row)) if row else None


async def get_current_user(user: Optional[UserResponse] = Depends(get_optional_user)) -> UserResponse:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(x_admin_token: Optional[str] = Header(None)) -> None:
    if not settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Admin endpoints are disabled (set ADMIN_TOKEN)")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, settings.ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid admin token")
