# tests/backend/test_market_analyzer.py
# Unit tests for the Pandas analytics engine (no database needed)

import asyncio
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest

from analytics.market_analyzer import (
    MarketAnalyzer,
    age_factor,
    build_market_report,
    clean_and_engineer,
    position_for_percentile,
    score_dataframe,
)


@pytest.fixture
def analyzer():
    return MarketAnalyzer(db_pool=MagicMock())


@pytest.fixture
def sample_df():
    rng = np.random.default_rng(42)
    return pd.DataFrame({
        "id": [str(i) for i in range(50)],
        "price_usd": rng.uniform(60000, 300000, 50),
        "area_sqm": rng.uniform(40, 150, 50),
        "price_per_sqm": rng.uniform(1000, 3000, 50),
        "bedrooms": rng.integers(1, 5, 50),
        "year_built": rng.integers(1980, 2023, 50),
        "listed_at": pd.date_range("2024-01-01", periods=50),
    })


class TestCleanAndEngineer:

    def test_removes_outliers(self):
        df = pd.DataFrame({
            "price_per_sqm": [1000, 5000, 5100, 4900, 5050, 999999],
            "year_built": [2000] * 6,
        })
        assert clean_and_engineer(df)["price_per_sqm"].max() < 999999

    def test_adds_features(self, sample_df):
        result = clean_and_engineer(sample_df)
        assert (result["age_years"] >= 0).all()
        assert (result["log_price_sqm"] > 0).all()
        assert "price_zscore" in result.columns

    def test_empty(self):
        assert clean_and_engineer(pd.DataFrame()).empty


class TestMarketReport:

    def test_structure_and_order(self, sample_df):
        report = build_market_report(clean_and_engineer(sample_df))
        d = report["price_distribution"]
        assert d["p10"] <= d["p25"] <= d["p50"] <= d["p75"] <= d["p90"]
        assert report["listings_analyzed"] > 0
        assert set(report["bedroom_breakdown"]) <= {"1", "2", "3", "4"}

    def test_empty_df_returns_empty(self, analyzer):
        assert analyzer.generate_market_report(pd.DataFrame()) == {}


class TestHelpers:

    @pytest.mark.parametrize("pct,expected", [(0, "underpriced"), (25, "underpriced"), (50, "fair_value"), (65, "fair_value"), (90, "overpriced")])
    def test_position(self, pct, expected):
        assert position_for_percentile(pct) == expected

    def test_age_factor_is_bounded(self):
        assert age_factor(0, 100) == 1.10
        assert age_factor(200, 0) == 0.90
        assert age_factor(20, 20) == 1.0


class TestComputeValueScore:

    def _run(self, analyzer, df, listing):
        analyzer._market_cache[analyzer._key("AZ", "Baku", "apartment", "sale")] = clean_and_engineer(df)
        analyzer._compute_price_trend = MagicMock(side_effect=lambda *a: asyncio.sleep(0, result=0.0))
        return asyncio.run(analyzer.compute_value_score(listing))

    def test_cheap_listing_gets_high_score(self, analyzer, sample_df):
        listing = {"country_code": "AZ", "city": "Baku", "property_type": "apartment", "listing_type": "sale",
                   "price_usd": 50000, "area_sqm": 80, "year_built": 2020}
        result = self._run(analyzer, sample_df, listing)
        assert result.value_score >= 7.0
        assert result.market_position == "underpriced"

    def test_expensive_listing_gets_low_score(self, analyzer, sample_df):
        listing = {"country_code": "AZ", "city": "Baku", "property_type": "apartment", "listing_type": "sale",
                   "price_usd": 5_000_000, "area_sqm": 80, "year_built": 2000}
        result = self._run(analyzer, sample_df, listing)
        assert result.value_score <= 3.0
        assert result.market_position == "overpriced"

    def test_insufficient_data_returns_default(self, analyzer):
        analyzer._market_cache[analyzer._key("XX", "Unknown", "apartment", "sale")] = pd.DataFrame()
        listing = {"country_code": "XX", "city": "Unknown", "property_type": "apartment",
                   "price_usd": 300000, "area_sqm": 75, "year_built": 2010}
        result = asyncio.run(analyzer.compute_value_score(listing))
        assert result.value_score == 5.0
        assert result.market_position == "insufficient_data"


class TestScoreDataframe:

    def _segment(self, n, city="Baku", listing_type="sale", start=1000):
        return pd.DataFrame({
            "id": [f"{city}-{listing_type}-{i}" for i in range(n)],
            "country_code": "AZ", "city": city, "property_type": "apartment",
            "listing_type": listing_type,
            "price_per_sqm": [start + 100 * i for i in range(n)],
            "year_built": 2000,
        })

    def test_cheapest_scores_highest(self):
        out = score_dataframe(self._segment(10))
        assert out["value_score"].iloc[0] == out["value_score"].max()
        assert out["value_score"].iloc[-1] == out["value_score"].min()
        assert out["market_position"].iloc[0] == "underpriced"
        assert out["market_position"].iloc[-1] == "overpriced"
        assert out["value_score"].between(0, 10).all()

    def test_sale_and_rent_are_scored_separately(self):
        # rent prices per m² are ~100x lower; they must not look "underpriced" next to sales
        df = pd.concat([self._segment(10, listing_type="sale", start=1500),
                        self._segment(10, listing_type="rent", start=8)])
        out = score_dataframe(df)
        rent = out[out["listing_type"] == "rent"]
        assert (rent["market_position"] == "underpriced").sum() < len(rent)

    def test_small_segment_is_insufficient(self):
        out = score_dataframe(self._segment(3))
        assert (out["market_position"] == "insufficient_data").all()
        assert (out["value_score"] == 5.0).all()


class TestDistrictScoring:

    def _district(self, district, n, start):
        return pd.DataFrame({
            "id": [f"{district}-{i}" for i in range(n)],
            "country_code": "AZ", "city": "Baku", "district": district,
            "property_type": "apartment", "listing_type": "sale",
            "price_per_sqm": [start + 50 * i for i in range(n)],
            "year_built": 2010,
        })

    def test_expensive_district_is_scored_within_itself(self):
        # Səbail is much pricier than Sabunçu; its cheapest flat is still a good deal
        df = pd.concat([self._district("Səbail", 10, 6000), self._district("Sabunçu", 10, 1200)])
        out = score_dataframe(df)
        sebail = out[out["district"] == "Səbail"]
        assert (sebail["segment_level"] == "district").all()
        assert sebail["market_position"].iloc[0] == "underpriced"

    def test_small_district_falls_back_to_city(self):
        df = pd.concat([self._district("Səbail", 10, 6000), self._district("Qaradağ", 3, 1000)])
        out = score_dataframe(df)
        qaradag = out[out["district"] == "Qaradağ"]
        assert (qaradag["segment_level"] == "city").all()
        assert (qaradag["market_position"] == "underpriced").all()
