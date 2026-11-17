from backend.db import pool_options


def test_neon_dsn_is_cleaned():
    dsn, options = pool_options(
        "postgresql://u:p@ep-cool-1.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    )
    assert "channel_binding" not in dsn
    assert "sslmode=require" in dsn
    assert options == {}


def test_pooler_disables_statement_cache():
    _, options = pool_options("postgresql://u:p@ep-cool-1-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require")
    assert options == {"statement_cache_size": 0}


def test_local_dsn_unchanged():
    dsn, options = pool_options("postgresql://velocite:velocite123@localhost:5432/velocite")
    assert dsn == "postgresql://velocite:velocite123@localhost:5432/velocite"
    assert options == {}
