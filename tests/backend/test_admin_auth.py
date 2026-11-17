import pytest

pytest.importorskip("fastapi")

from fastapi import HTTPException  # noqa: E402

from backend.config import settings  # noqa: E402
from backend.deps import require_admin  # noqa: E402


def test_admin_disabled_without_token(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", None)
    with pytest.raises(HTTPException) as e:
        require_admin("anything")
    assert e.value.status_code == 403


def test_admin_token_checked(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_TOKEN", "secret")
    with pytest.raises(HTTPException):
        require_admin("wrong")
    with pytest.raises(HTTPException):
        require_admin(None)
    assert require_admin("secret") is None
