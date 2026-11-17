"""
Benchmark: C++ ranking engine vs the pure-Python fallback (same formula).

Run after building the module:  PYTHONPATH=build python scripts/benchmark_ranking.py
"""
import os
import random
import statistics
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services import ranking  # noqa: E402

try:
    import real_estate_engine
except ImportError:
    sys.exit("C++ module not built — run cmake first")

CENTER = (40.4093, 49.8671)  # Baku


def make_features(n: int, seed: int = 42) -> list[dict]:
    rnd = random.Random(seed)
    return [
        {
            "id": f"l{i}",
            "lat": CENTER[0] + rnd.uniform(-0.1, 0.1),
            "lng": CENTER[1] + rnd.uniform(-0.1, 0.1),
            "value_score": rnd.uniform(0, 10),
            "days_listed": rnd.uniform(0, 90),
            "completeness": rnd.uniform(0, 10),
        }
        for i in range(n)
    ]


def best_of(fn, repeats: int) -> float:
    times = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        times.append(time.perf_counter() - start)
    return min(times), statistics.median(times)


def main() -> None:
    engine = real_estate_engine.SearchEngine()
    print(f"{'listings':>9} | {'Python ms':>10} | {'C++ ms':>8} | speed-up")
    print("-" * 46)
    for n in (500, 5_000, 50_000, 200_000):
        feats = make_features(n)
        repeats = 7 if n <= 50_000 else 3
        py_best, _ = best_of(lambda: ranking._python_rank(feats, *CENTER), repeats)
        cpp_best, _ = best_of(lambda: engine.rank_listings(feats, *CENTER), repeats)
        # same order and scores
        assert [r[0] for r in engine.rank_listings(feats, *CENTER)] == [r[0] for r in ranking._python_rank(feats, *CENTER)]
        print(f"{n:>9,} | {py_best * 1000:>10.2f} | {cpp_best * 1000:>8.2f} | {py_best / cpp_best:>6.1f}x")


if __name__ == "__main__":
    main()
