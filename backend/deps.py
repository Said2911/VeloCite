# backend/deps.py
# FastAPI dependencies shared by the routers

import hmac
from typing import Optional

from fastapi import Header, HTTPException, Request

from backend.config import settings


def get_db(request: Request):
    return request.app.state.db_pool


def get_cache(request: Request):
    return request.app.state.cache


def require_admin(x_admin_token: Optional[str] = Header(None)) -> None:
    if not settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Admin endpoints are disabled (set ADMIN_TOKEN)")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, settings.ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid admin token")
