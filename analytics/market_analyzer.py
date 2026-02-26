# analytics/market_analyzer.py
# Pandas/NumPy engine for market analysis and value scoring

import pandas as pd
import numpy as np
from scipy import stats
from dataclasses import dataclass
from typing import Optional
import asyncpg


@dataclass
class MarketInsight:
    """Result of analyzing a single listing against its market."""
    value_score: float        # 0-10 (10 = best deal)
    market_position: str      # underpriced / fair_value / overpriced
    percentile: float         # where listing sits in market (0-100)
    price_trend_30d: float    # market price change % last 30 days
    comparable_count: int     # how many listings were analyzed


class MarketAnalyzer:
    """
    Core analytics engine.
    Loads listings into Pandas DataFrames and computes:
    - Value for Money scores
    - Market position (underpriced/fair/overpriced)
    - Price trends
    - Market distribution reports
    """

    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        # In-memory cache: {country:city:type -> DataFrame}
        self._market_cache: dict[str, pd.DataFrame] = {}

    async def load_market_data(
        self,
        country_code: str,
        city: str,
        property_type: str
    ) -> pd.DataFrame:
        """
        Load all comparable listings for a market segment into a DataFrame.
        Results are cached in memory to avoid repeated DB queries.
        """
        cache_key = f"{country_code}:{city}:{property_type}"

        if cache_key in self._market_cache:
            return self._market_cache[cache_key]

        query = """
            SELECT
                id,
                price_usd,
                area_sqm,
                price_per_sqm,
                bedrooms,
                year_built,
                listed_at,
                ST_X(location::geometry) as lng,
                ST_Y(location::geometry) as lat
            FROM listings
            WHERE country_code = $1
              AND city = $2
              AND property_type = $3
              AND is_active = TRUE
              AND area_sqm IS NOT NULL
              AND price_per_sqm IS NOT NULL
        """

        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, country_code, city, property_type)

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame([dict(r) for r in rows])
        df = self._clean_and_engineer(df)

        # Cache for this session
        self._market_cache[cache_key] = df
        return df

    def _clean_and_engineer(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean raw data and engineer features for scoring.
        Removes outliers and adds derived columns.
        """
        # Remove extreme outliers using 5th-95th percentile
        q_low = df['price_per_sqm'].quantile(0.05)
        q_high = df['price_per_sqm'].quantile(0.95)
        df = df[
            (df['price_per_sqm'] >= q_low) &
            (df['price_per_sqm'] <= q_high)
        ].copy()

        # Calculate property age
        current_year = pd.Timestamp.now().year
        df['age_years'] = current_year - df['year_built'].fillna(
            df['year_built'].median()
        )

        # Log-transform price (real estate prices are right-skewed)
        # log makes the distribution more normal for statistical analysis
        df['log_price_sqm'] = np.log1p(df['price_per_sqm'])

        # Z-score: how many standard deviations from the mean
        df['price_zscore'] = stats.zscore(df['log_price_sqm'])

        return df

    async def compute_value_score(self, listing: dict) -> MarketInsight:
        """
        Core algorithm: compute Value-for-Money score for a single listing.

        Logic:
        - Find all comparable listings in same city/type
        - Calculate where this listing sits in the price distribution
        - Lower price relative to market = higher score
        - Adjust slightly for property age
        """
        df = await self.load_market_data(
            listing['country_code'],
            listing['city'],
            listing['property_type']
        )

        # Not enough data to analyze
        if df.empty or len(df) < 5:
            return MarketInsight(
                value_score=5.0,
                market_position='insufficient_data',
                percentile=50.0,
                price_trend_30d=0.0,
                comparable_count=0
            )

        # Price per sqm of this specific listing
        target_ppsqm = listing['price_usd'] / listing['area_sqm']

        # Where does this listing sit in the market? (0=cheapest, 100=most expensive)
        percentile = float(stats.percentileofscore(
            df['price_per_sqm'], target_ppsqm
        ))

        # Value score: cheaper than market = higher score
        # percentile 0  (cheapest) → score 10
        # percentile 50 (average)  → score 5
        # percentile 100 (priciest) → score 0
        raw_score = 10.0 * (1.0 - percentile / 100.0)

        # Age adjustment: newer properties get slight bonus
        age_median = float(df['age_years'].median())
        listing_age = pd.Timestamp.now().year - (
            listing.get('year_built') or
            int(pd.Timestamp.now().year - age_median)
        )
        # Max ±10% adjustment for age
        age_factor = float(np.clip(
            1.0 + (age_median - listing_age) * 0.005,
            0.90, 1.10
        ))

        value_score = float(np.clip(raw_score * age_factor, 0.0, 10.0))

        # Market position label
        if percentile <= 25:
            market_position = 'underpriced'
        elif percentile <= 65:
            market_position = 'fair_value'
        else:
            market_position = 'overpriced'

        # Get price trend
        trend = await self._compute_price_trend(
            listing['country_code'],
            listing['city'],
            listing['property_type']
        )

        return MarketInsight(
            value_score=round(value_score, 2),
            market_position=market_position,
            percentile=round(percentile, 1),
            price_trend_30d=trend,
            comparable_count=len(df)
        )

    async def _compute_price_trend(
        self,
        country_code: str,
        city: str,
        property_type: str
    ) -> float:
        """
        Calculate 30-day price trend for a market segment.
        Compares average price/sqm in last 30 days vs previous 30 days.
        Returns percentage change (e.g. +2.5 means prices up 2.5%)
        """
        query = """
            SELECT
                DATE(p.recorded_at) as date,
                AVG(p.price_usd / l.area_sqm) as avg_ppsqm
            FROM price_history p
            JOIN listings l ON p.listing_id = l.id
            WHERE l.country_code = $1
              AND l.city = $2
              AND l.property_type = $3
              AND p.recorded_at >= NOW() - INTERVAL '60 days'
              AND l.area_sqm > 0
            GROUP BY DATE(p.recorded_at)
            ORDER BY date
        """

        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, country_code, city, property_type)

        if len(rows) < 10:
            return 0.0

        df = pd.DataFrame([dict(r) for r in rows])

        # Split into two 30-day windows and compare averages
        mid = len(df) // 2
        old_avg = float(df.iloc[:mid]['avg_ppsqm'].mean())
        new_avg = float(df.iloc[mid:]['avg_ppsqm'].mean())

        if old_avg == 0:
            return 0.0

        return round(((new_avg - old_avg) / old_avg) * 100, 2)

    def generate_market_report(self, df: pd.DataFrame) -> dict:
        """
        Generate summary statistics for a market segment.
        This fills the market_summary field in SearchResponse.
        """
        if df.empty:
            return {}

        return {
            'median_price_sqm': round(float(df['price_per_sqm'].median()), 2),
            'avg_price_sqm': round(float(df['price_per_sqm'].mean()), 2),
            'listings_analyzed': len(df),
            'price_distribution': {
                'p10': round(float(df['price_per_sqm'].quantile(0.10)), 2),
                'p25': round(float(df['price_per_sqm'].quantile(0.25)), 2),
                'p50': round(float(df['price_per_sqm'].quantile(0.50)), 2),
                'p75': round(float(df['price_per_sqm'].quantile(0.75)), 2),
                'p90': round(float(df['price_per_sqm'].quantile(0.90)), 2),
            },
            'bedroom_breakdown': {
                str(k): round(float(v), 2)
                for k, v in df.groupby('bedrooms')['price_per_sqm']
                .median().to_dict().items()
            }
        }

    def invalidate_cache(self, country_code: str, city: str, property_type: str):
        """Clear cached market data for a segment (call after bulk data updates)."""
        cache_key = f"{country_code}:{city}:{property_type}"
        self._market_cache.pop(cache_key, None)