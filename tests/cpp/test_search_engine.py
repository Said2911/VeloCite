# tests/cpp/test_search_engine.py
# Smoke tests for the C++ search engine
# These run after the module is compiled via CMake

import pytest

# Module will be available after `cmake --build`
try:
    import real_estate_engine as cpp_engine
    CPP_AVAILABLE = True
except ImportError:
    CPP_AVAILABLE = False

BAKU = (40.4093, 49.8671)
GANJA = (40.6828, 46.3606)
LANKARAN = (38.7543, 48.8506)


@pytest.mark.skipif(not CPP_AVAILABLE, reason="C++ module not compiled yet")
class TestSearchEngine:

    def setup_method(self):
        self.engine = cpp_engine.SearchEngine()

    def test_engine_loads(self):
        assert self.engine is not None

    def test_rank_listings_sorted_by_score(self):
        listings = [
            {"id": "a", "lat": 40.409, "lng": 49.867, "value_score": 3.0},
            {"id": "b", "lat": 40.419, "lng": 49.877, "value_score": 9.0},
            {"id": "c", "lat": 40.399, "lng": 49.857, "value_score": 6.0},
        ]
        results = self.engine.rank_listings(listings, *BAKU)
        scores = [r[1] for r in results]

        # Must be sorted descending
        assert scores == sorted(scores, reverse=True)

    def test_rank_listings_returns_all_ids(self):
        listings = [
            {"id": "x", "lat": 40.68, "lng": 46.36, "value_score": 5.0},
            {"id": "y", "lat": 40.69, "lng": 46.37, "value_score": 7.0},
        ]
        ids = [r[0] for r in self.engine.rank_listings(listings, *GANJA)]

        assert "x" in ids
        assert "y" in ids

    def test_rank_listings_accepts_missing_values(self):
        listings = [{"id": "a", "lat": None, "lng": None, "value_score": None}]
        assert [r[0] for r in self.engine.rank_listings(listings, *BAKU)] == ["a"]

    def test_bbox_filter(self):
        import numpy as np
        lats = np.array([BAKU[0], GANJA[0], LANKARAN[0]])
        lngs = np.array([BAKU[1], GANJA[1], LANKARAN[1]])

        # Absheron peninsula box: only Baku should pass
        mask = self.engine.bbox_filter(lats, lngs, 40.2, 40.7, 49.4, 50.4)
        assert mask[0]         # Baku ✅
        assert not mask[1]     # Ganja ❌
        assert not mask[2]     # Lankaran ❌

    def test_normalize_prices(self):
        import numpy as np
        prices = np.array([100000.0, 300000.0, 500000.0])
        normalized = self.engine.normalize_prices(prices)

        assert abs(normalized[0] - 0.0) < 0.001  # min = 0
        assert abs(normalized[2] - 1.0) < 0.001  # max = 1

    def test_normalize_prices_empty(self):
        import numpy as np
        assert len(self.engine.normalize_prices(np.array([], dtype=float))) == 0


@pytest.mark.skipif(not CPP_AVAILABLE, reason="C++ module not compiled yet")
def test_cpp_and_python_ranking_agree():
    """backend/services/ranking.py must mirror cpp/search_engine.cpp."""
    from backend.services import ranking

    listings = [
        {"id": "a", "lat": 40.409, "lng": 49.867, "value_score": 3.0, "days_listed": 2, "completeness": 10},
        {"id": "b", "lat": 40.500, "lng": 49.950, "value_score": 9.0, "days_listed": 40, "completeness": 5},
        {"id": "c", "lat": 40.399, "lng": 49.857, "value_score": None, "days_listed": 0, "completeness": 0},
    ]
    cpp = cpp_engine.SearchEngine().rank_listings(listings, *BAKU)
    py = ranking._python_rank(listings, *BAKU)
    assert [r[0] for r in cpp] == [r[0] for r in py]
    for (_, a), (_, b) in zip(cpp, py):
        assert abs(a - b) < 1e-9
