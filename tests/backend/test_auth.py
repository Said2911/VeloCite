import time

from backend.services.auth import create_token, decode_token, hash_password, verify_password

SECRET = "test-secret"


def test_password_roundtrip():
    stored = hash_password("correct horse", iterations=1000)
    assert verify_password("correct horse", stored)
    assert not verify_password("wrong", stored)


def test_hashes_are_salted():
    assert hash_password("same", iterations=1000) != hash_password("same", iterations=1000)


def test_verify_rejects_garbage():
    assert not verify_password("x", "not-a-hash")
    assert not verify_password("x", "md5$1$00$00")


def test_token_roundtrip():
    token = create_token("user-1", SECRET, 5)
    payload = decode_token(token, SECRET)
    assert payload["sub"] == "user-1"
    assert payload["exp"] > time.time()


def test_token_wrong_secret_or_tampered():
    token = create_token("user-1", SECRET, 5)
    assert decode_token(token, "other-secret") is None
    header, payload, sig = token.split(".")
    assert decode_token(f"{header}.{payload}x.{sig}", SECRET) is None
    assert decode_token("garbage", SECRET) is None


def test_token_expired():
    token = create_token("user-1", SECRET, -1)
    assert decode_token(token, SECRET) is None
