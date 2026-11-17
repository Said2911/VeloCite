# backend/db.py
# Database helpers: SQL migration runner

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Arbitrary constant so concurrent API instances don't migrate at the same time
MIGRATION_LOCK_ID = 727_001


async def run_migrations(pool, migrations_dir: str) -> list[str]:
    """
    Apply every *.sql file in `migrations_dir`, in name order.

    All migration files are written to be idempotent (IF NOT EXISTS etc.), so
    running them on every startup is safe — including on databases that were
    created before this runner existed. Returns the list of failed files.
    """
    files = sorted(Path(migrations_dir).glob("*.sql"))
    if not files:
        logger.warning("No migration files found in %s", migrations_dir)
        return []

    failed: list[str] = []
    async with pool.acquire() as conn:
        await conn.execute("SELECT pg_advisory_lock($1)", MIGRATION_LOCK_ID)
        try:
            for path in files:
                try:
                    async with conn.transaction():
                        await conn.execute(path.read_text(encoding="utf-8"))
                    logger.info("Migration applied: %s", path.name)
                except Exception as e:
                    failed.append(path.name)
                    logger.error("Migration %s FAILED: %s", path.name, e)
        finally:
            await conn.execute("SELECT pg_advisory_unlock($1)", MIGRATION_LOCK_ID)
    return failed
