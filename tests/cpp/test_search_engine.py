# tests/cpp/test_search_engine.py
# Smoke tests for the C++ search engine
# These run after the module is compiled via CMake

import sys
import os
import pytest

# Module will be available after `cmake --build`
try:
    import real_estate_engine as cpp_engine
    CPP_AVAILABLE = True
except ImportError:
    CPP_AVAILABLE = False

@pytest.mark.skipif(not CPP_AVAILABLE, reason="C++ module not compiled yet")
class TestSearchEngine:

    def setup_method(self):
        self.engine = cpp_engine.SearchEngine()

    def test_engine_loads(self):
        assert self.engine is not None

    def test_rank_listings_sorted_by_score(self):
        listings = [
            {"id": "a", "lat": 52.52, "lng": 13.40, "value_score": 3.0},
            {"id": "b", "lat": 52.53, "lng": 13.41, "value_score": 9.0},
            {"id": "c", "lat": 52.51, "lng": 13.39, "value_score": 6.0},
        ]
        results = self.engine.rank_listings(listings, 52.52, 13.40)
        scores = [r[1] for r in results]

        # Must be sorted descending
        assert scores == sorted(scores, reverse=True)

    def test_rank_listings_returns_all_ids(self):
        listings = [
            {"id": "x", "lat": 48.85, "lng": 2.35, "value_score": 5.0},
            {"id": "y", "lat": 48.86, "lng": 2.36, "value_score": 7.0},
        ]
        results = self.engine.rank_listings(listings, 48.85, 2.35)
        ids = [r[0] for r in results]

        assert "x" in ids
        assert "y" in ids

    def test_bbox_filter(self):
        import numpy as np
        lats = np.array([52.52, 48.85, 40.71])
        lngs = np.array([13.40, 2.35, -74.00])

        # Only Berlin should pass
        mask = self.engine.bbox_filter(lats, lngs, 50.0, 55.0, 10.0, 15.0)
        assert mask[0] == True   # Berlin ✅
        assert mask[1] == False  # Paris ❌
        assert mask[2] == False  # NYC   ❌

    def test_normalize_prices(self):
        import numpy as np
        prices = np.array([100000.0, 300000.0, 500000.0])
        normalized = self.engine.normalize_prices(prices)

        assert abs(normalized[0] - 0.0) < 0.001  # min = 0
        assert abs(normalized[2] - 1.0) < 0.001  # max = 1