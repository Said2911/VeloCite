# tests/backend/test_market_analyzer.py
# Unit tests for the Pandas analytics engine

import pytest
import pandas as pd
import numpy as np
from unittest.mock import AsyncMock, MagicMock
from analytics.market_analyzer import MarketAnalyzer, MarketInsight


@pytest.fixture
def analyzer():
    """Create analyzer with a mock DB pool."""
    mock_pool = AsyncMock()
    return MarketAnalyzer(db_pool=mock_pool)


@pytest.fixture
def sample_df():
    """Sample market DataFrame for testing."""
    return pd.DataFrame({
        'id': [str(i) for i in range(50)],
        'price_usd': np.random.uniform(200000, 800000, 50),
        'area_sqm': np.random.uniform(40, 150, 50),
        'price_per_sqm': np.random.uniform(3000, 9000, 50),
        'bedrooms': np.random.randint(1, 5, 50),
        'year_built': np.random.randint(1980, 2023, 50),
        'listed_at': pd.date_range('2024-01-01', periods=50),
        'lat': np.random.uniform(52.4, 52.6, 50),
        'lng': np.random.uniform(13.3, 13.5, 50),
    })


class TestCleanAndEngineer:

    def test_removes_outliers(self, analyzer):
        df = pd.DataFrame({
            'price_per_sqm': [1000, 5000, 5100, 4900, 5050, 999999],
            'price_usd': [100000]*6,
            'area_sqm': [50]*6,
            'bedrooms': [2]*6,
            'year_built': [2000]*6,
            'listed_at': pd.date_range('2024-01-01', periods=6),
            'lat': [52.5]*6,
            'lng': [13.4]*6,
            'id': [str(i) for i in range(6)],
        })
        result = analyzer._clean_and_engineer(df)
        # Extreme outlier (999999) should be removed
        assert result['price_per_sqm'].max() < 999999

    def test_adds_age_column(self, analyzer, sample_df):
        result = analyzer._clean_and_engineer(sample_df)
        assert 'age_years' in result.columns
        assert (result['age_years'] >= 0).all()

    def test_adds_log_price(self, analyzer, sample_df):
        result = analyzer._clean_and_engineer(sample_df)
        assert 'log_price_sqm' in result.columns
        assert (result['log_price_sqm'] > 0).all()


class TestGenerateMarketReport:

    def test_report_structure(self, analyzer, sample_df):
        df = analyzer._clean_and_engineer(sample_df)
        report = analyzer.generate_market_report(df)

        assert 'median_price_sqm' in report
        assert 'avg_price_sqm' in report
        assert 'listings_analyzed' in report
        assert 'price_distribution' in report
        assert 'bedroom_breakdown' in report

    def test_percentiles_ordered(self, analyzer, sample_df):
        df = analyzer._clean_and_engineer(sample_df)
        report = analyzer.generate_market_report(df)
        dist = report['price_distribution']

        # p10 < p25 < p50 < p75 < p90
        assert dist['p10'] <= dist['p25'] <= dist['p50']
        assert dist['p50'] <= dist['p75'] <= dist['p90']

    def test_empty_df_returns_empty(self, analyzer):
        result = analyzer.generate_market_report(pd.DataFrame())
        assert result == {}


class TestComputeValueScore:

    @pytest.mark.asyncio
    async def test_cheap_listing_gets_high_score(self, analyzer, sample_df):
        df = analyzer._clean_and_engineer(sample_df)
        analyzer._market_cache['DE:Berlin:apartment'] = df

        # Very cheap listing (below market)
        listing = {
            'country_code': 'DE', 'city': 'Berlin',
            'property_type': 'apartment',
            'price_usd': 50000, 'area_sqm': 80,
            'year_built': 2020
        }
        result = await analyzer.compute_value_score(listing)
        assert result.value_score >= 7.0
        assert result.market_position == 'underpriced'

    @pytest.mark.asyncio
    async def test_expensive_listing_gets_low_score(self, analyzer, sample_df):
        df = analyzer._clean_and_engineer(sample_df)
        analyzer._market_cache['DE:Berlin:apartment'] = df

        # Very expensive listing (above market)
        listing = {
            'country_code': 'DE', 'city': 'Berlin',
            'property_type': 'apartment',
            'price_usd': 5000000, 'area_sqm': 80,
            'year_built': 2000
        }
        result = await analyzer.compute_value_score(listing)
        assert result.value_score <= 3.0
        assert result.market_position == 'overpriced'

    @pytest.mark.asyncio
    async def test_insufficient_data_returns_default(self, analyzer):
        # Empty cache — DB returns nothing
        analyzer._market_cache['XX:Unknown:apartment'] = pd.DataFrame()

        listing = {
            'country_code': 'XX', 'city': 'Unknown',
            'property_type': 'apartment',
            'price_usd': 300000, 'area_sqm': 75,
            'year_built': 2010
        }
        result = await analyzer.compute_value_score(listing)
        assert result.value_score == 5.0
        assert result.market_position == 'insufficient_data'