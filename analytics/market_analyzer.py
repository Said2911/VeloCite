# analytics/market_analyzer.py
# Pandas/NumPy engine for market analysis and value scoring

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import numpy as np
import pandas as pd
from scipy import stats

if TYPE_CHECKING:  # asyncpg is only needed for type hints here
    import asyncpg

logger = logging.getLogger(__name__)

# Average % change between each listing's asking price 30–90 days ago and now.
# Callers append a WHERE clause on `l` and (optionally) GROUP BY.
PRICE_TREND_SQL = """
    WITH earlier AS (
        SELECT DISTINCT ON (p.listing_id) p.listing_id, p.price_usd AS old_price
        FROM price_history p
        WHERE p.recorded_at <  NOW() - INTERVAL '30 days'
          AND p.recorded_at >= NOW() - INTERVAL '90 days'
          AND p.price_usd > 0
        ORDER BY p.listing_id, p.recorded_at DESC
    )
    SELECT AVG((l.price_usd - e.old_price) / e.old_price) * 100 AS trend
    FROM earlier e
    JOIN listings l ON l.id = e.listing_id AND l.is_active = TRUE
"""

MIN_COMPARABLES = 5          # below this a segment has "insufficient data"
MIN_DISTRICT_COMPARABLES = 8  # district used instead of city when it has this many
UNDERPRICED_PERCENTILE = 25  # cheapest 25% per m² → underpriced
FAIR_PERCENTILE = 65         # 25–65% → fair value, above → overpriced


@dataclass
class MarketInsight:
    """Result of analyzing a single listing against its market."""
    value_score: float        # 0-10 (10 = best deal)
    market_position: str      # underpriced / fair_value / overpriced / insufficient_data
    percentile: float         # where listing sits in market (0-100)
    price_trend_30d: float    # market price change % last 30 days
    comparable_count: int     # how many listings were analyzed


# ─── Pure functions (no DB) — easy to unit-test ───────────────────────────────

def position_for_percentile(percentile: float) -> str:
    if percentile <= UNDERPRICED_PERCENTILE:
        return "underpriced"
    if percentile <= FAIR_PERCENTILE:
        return "fair_value"
    return "overpriced"


def age_factor(listing_age: float, median_age: float) -> float:
    """Newer than the market median → small bonus, older → small penalty (±10% max)."""
    return float(np.clip(1.0 + (median_age - listing_age) * 0.005, 0.90, 1.10))


def clean_and_engineer(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw data and engineer features for scoring.
    Removes outliers and adds derived columns.
    """
    if df.empty:
        return df.copy()

    df = df.copy()
    df["price_per_sqm"] = df["price_per_sqm"].astype(float)

    # Remove extreme outliers using 5th-95th percentile
    q_low = df["price_per_sqm"].quantile(0.05)
    q_high = df["price_per_sqm"].quantile(0.95)
    df = df[(df["price_per_sqm"] >= q_low) & (df["price_per_sqm"] <= q_high)].copy()

    # Property age
    current_year = pd.Timestamp.now().year
    if "year_built" in df.columns:
        year_built = pd.to_numeric(df["year_built"], errors="coerce")
        median_year = year_built.median()
        df["age_years"] = current_year - year_built.fillna(
            median_year if pd.notna(median_year) else current_year
        )

    # Log-transform price (real estate prices are right-skewed)
    df["log_price_sqm"] = np.log1p(df["price_per_sqm"])

    # Z-score: how many standard deviations from the mean
    if len(df) > 1 and df["log_price_sqm"].std() > 0:
        df["price_zscore"] = stats.zscore(df["log_price_sqm"])
    else:
        df["price_zscore"] = 0.0

    return df


def build_market_report(df: pd.DataFrame) -> dict[str, Any]:
    """
    Summary statistics for a market segment (values in USD per m²).
    Fills the `market_summary` field of search responses.
    """
    if df.empty or "price_per_sqm" not in df.columns:
        return {}

    ppsqm = df["price_per_sqm"].dropna().astype(float)
    if ppsqm.empty:
        return {}

    report: dict[str, Any] = {
        "median_price_sqm": round(float(ppsqm.median()), 2),
        "avg_price_sqm": round(float(ppsqm.mean()), 2),
        "listings_analyzed": int(len(ppsqm)),
        "price_distribution": {
            f"p{q}": round(float(ppsqm.quantile(q / 100)), 2) for q in (10, 25, 50, 75, 90)
        },
        "bedroom_breakdown": {},
    }

    if "bedrooms" in df.columns:
        by_bedrooms = (
            df.dropna(subset=["bedrooms", "price_per_sqm"])
            .assign(price_per_sqm=lambda d: d["price_per_sqm"].astype(float))
            .groupby("bedrooms")["price_per_sqm"]
            .median()
        )
        report["bedroom_breakdown"] = {
            str(int(k)): round(float(v), 2) for k, v in by_bedrooms.items()
        }

    return report


def _score_segments(out: pd.DataFrame, segment: list[str], min_count: int) -> None:
    """Score every group of `segment` with at least `min_count` prices (in place)."""
    current_year = pd.Timestamp.now().year
    for _, idx in out.groupby(segment, dropna=True).groups.items():
        group = out.loc[idx]
        valid = group["price_per_sqm"].notna()
        if valid.sum() < min_count:
            continue

        g = group[valid]
        pct = g["price_per_sqm"].rank(pct=True, method="average") * 100.0
        raw_score = 10.0 * (1.0 - pct / 100.0)

        years = pd.to_numeric(g["year_built"], errors="coerce")
        median_year = years.median()
        if pd.isna(median_year):
            factors = pd.Series(1.0, index=g.index)
        else:
            ages = current_year - years.fillna(median_year)
            median_age = current_year - median_year
            factors = ages.apply(lambda a: age_factor(a, median_age))

        out.loc[g.index, "percentile"] = pct.round(1)
        out.loc[g.index, "value_score"] = (raw_score * factors).clip(0.0, 10.0).round(2)
        out.loc[g.index, "market_position"] = pct.apply(position_for_percentile)
        out.loc[g.index, "segment_level"] = "district" if "district" in segment else "city"


def score_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Vectorised value scoring for many listings at once.

    Expects columns: country_code, city, property_type, listing_type,
    price_per_sqm, year_built and (optionally) district.

    Each listing is compared with similar listings (same property type and
    sale/rent) in the same city. In big cities a listing is compared within
    its own district instead, when the district has at least
    MIN_DISTRICT_COMPARABLES similar listings — a flat in Səbail should not be
    called "overpriced" just because Səbail is more expensive than Sabunçu.

    Adds columns: percentile, value_score, market_position, segment_level.
    """
    out = df.reset_index(drop=True)  # unique labels for .loc updates
    out["percentile"] = np.nan
    out["value_score"] = 5.0
    out["market_position"] = "insufficient_data"
    out["segment_level"] = None

    if out.empty:
        return out

    out["price_per_sqm"] = pd.to_numeric(out["price_per_sqm"], errors="coerce").astype(float)

    _score_segments(out, ["country_code", "city", "property_type", "listing_type"], MIN_COMPARABLES)
    if "district" in out.columns:
        _score_segments(
            out,
            ["country_code", "city", "district", "property_type", "listing_type"],
            MIN_DISTRICT_COMPARABLES,
        )
    return out


# ─── DB-backed analyzer ───────────────────────────────────────────────────────

class MarketAnalyzer:
    """
    Core analytics engine.
    Loads listings into Pandas DataFrames and computes:
    - Value for Money scores
    - Market position (underpriced/fair/overpriced)
    - Price trends
    - Market distribution reports
    """

    def __init__(self, db_pool: "asyncpg.Pool"):
        self.db_pool = db_pool
        # In-memory cache: {country:city:type:listing_type -> DataFrame}
        self._market_cache: dict[str, pd.DataFrame] = {}

    @staticmethod
    def _key(country_code: str, city: str, property_type: str, listing_type: str = "sale") -> str:
        return f"{country_code}:{city}:{property_type}:{listing_type}"

    async def load_market_data(
        self,
        country_code: str,
        city: str,
        property_type: str,
        listing_type: str = "sale",
    ) -> pd.DataFrame:
        """
        Load all comparable listings for a market segment into a DataFrame.
        Results are cached in memory to avoid repeated DB queries.
        """
        cache_key = self._key(country_code, city, property_type, listing_type)
        if cache_key in self._market_cache:
            return self._market_cache[cache_key]

        query = """
            SELECT id, price_usd, area_sqm, price_per_sqm, bedrooms, year_built, listed_at,
                   ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
            FROM listings
            WHERE country_code = $1 AND city = $2 AND property_type = $3
              AND listing_type = $4 AND is_active = TRUE
              AND area_sqm IS NOT NULL AND price_per_sqm IS NOT NULL
        """
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, country_code, city, property_type, listing_type)

        if not rows:
            return pd.DataFrame()

        df = clean_and_engineer(pd.DataFrame([dict(r) for r in rows]))
        self._market_cache[cache_key] = df
        return df

    # Kept as a method for backwards compatibility
    def _clean_and_engineer(self, df: pd.DataFrame) -> pd.DataFrame:
        return clean_and_engineer(df)

    async def compute_value_score(self, listing: dict) -> MarketInsight:
        """
        Compute the Value-for-Money score for a single listing.

        - Find comparable listings in the same city / type / sale-or-rent
        - Calculate where this listing sits in the price-per-m² distribution
        - Lower price relative to market = higher score
        - Adjust slightly for property age
        """
        listing_type = listing.get("listing_type", "sale")
        df = await self.load_market_data(
            listing["country_code"], listing["city"], listing["property_type"], listing_type
        )

        if df.empty or len(df) < MIN_COMPARABLES:
            return MarketInsight(5.0, "insufficient_data", 50.0, 0.0, 0)

        target_ppsqm = float(listing["price_usd"]) / float(listing["area_sqm"])
        percentile = float(stats.percentileofscore(df["price_per_sqm"], target_ppsqm))
        raw_score = 10.0 * (1.0 - percentile / 100.0)

        current_year = pd.Timestamp.now().year
        median_age = float(df["age_years"].median())
        year_built = listing.get("year_built") or int(current_year - median_age)
        value_score = float(np.clip(raw_score * age_factor(current_year - year_built, median_age), 0, 10))

        trend = await self._compute_price_trend(
            listing["country_code"], listing["city"], listing["property_type"], listing_type
        )

        return MarketInsight(
            value_score=round(value_score, 2),
            market_position=position_for_percentile(percentile),
            percentile=round(percentile, 1),
            price_trend_30d=trend,
            comparable_count=len(df),
        )

    async def _compute_price_trend(
        self, country_code: str, city: str, property_type: str, listing_type: str = "sale"
    ) -> float:
        """
        30-day price trend for a market segment: for every listing that was
        already on the market 30–90 days ago, compare that earlier asking price
        with today's, then average. Comparing the *same* listings avoids the
        noise of a changing mix of properties. Returns % (+2.5 = up 2.5%).
        """
        query = PRICE_TREND_SQL + """
            WHERE l.country_code = $1 AND l.city = $2 AND l.property_type = $3 AND l.listing_type = $4
        """
        try:
            async with self.db_pool.acquire() as conn:
                value = await conn.fetchval(query, country_code, city, property_type, listing_type)
        except Exception as e:
            logger.warning("Price trend query failed: %s", e)
            return 0.0
        return round(float(value), 2) if value is not None else 0.0

    def generate_market_report(self, df: pd.DataFrame) -> dict:
        """Summary statistics for a market segment (see build_market_report)."""
        return build_market_report(df)

    def invalidate_cache(self, country_code: str, city: str, property_type: str, listing_type: str = "sale"):
        """Clear cached market data for a segment (call after bulk data updates)."""
        self._market_cache.pop(self._key(country_code, city, property_type, listing_type), None)
