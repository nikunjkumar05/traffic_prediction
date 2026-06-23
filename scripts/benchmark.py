"""
Benchmark suite for DispatchMind API latency, pipeline throughput, and concurrent load.

Usage:
    python scripts/benchmark.py              # Run all benchmarks
    python scripts/benchmark.py --api-only    # API latency only
    python scripts/benchmark.py --pipeline    # Pipeline throughput only
    python scripts/benchmark.py --concurrent  # Concurrent load test only

Exit code:
    0 if all benchmarks pass
    1 if any benchmark fails
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

API_BASE = "http://localhost:8000"
PIPELINE_SCRIPT = REPO_ROOT / "src" / "data_pipeline.py"
VIOLATIONS_CSV = REPO_ROOT / "data" / "raw" / "violations.csv"
COORDS_JSON = REPO_ROOT / "data" / "external" / "junction_coords.json"

THRESHOLD_API_P50_MS = 500
THRESHOLD_API_P95_MS = 2000
THRESHOLD_PIPELINE_SEC = 120
THRESHOLD_CONCURRENT_PASS = 0.8

ENDPOINTS = [
    "/api/health",
    "/api/status",
    "/api/stations",
    "/api/overview",
    "/api/priority-queue/ALL",
    "/api/map-data",
    "/api/cascade",
    "/api/cascade/gnn-predict",
    "/api/curbflex",
    "/api/dispatch",
    "/api/alerts",
    "/api/repeat-offenders",
    "/api/impact-summary",
    "/api/spillover-zones",
    "/api/early-warning-system",
    "/api/capacity-status",
    "/api/causal-impact",
    "/api/flipkart-logistics",
    "/api/cost-metrics",
    "/api/degradation-status",
    "/api/recent-events",
]


def fetch(endpoint: str, timeout: int = 30):
    url = f"{API_BASE}{endpoint}"
    start = time.perf_counter()
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            resp.read()
        elapsed_ms = (time.perf_counter() - start) * 1000
        return elapsed_ms, True, resp.length or 0
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        return elapsed_ms, False, str(e)


def bench_api():
    print("\n" + "=" * 60)
    print("Benchmark: API Latency")
    print("=" * 60)

    results = []
    for ep in ENDPOINTS:
        elapsed_ms, ok, info = fetch(ep)
        status = "OK" if ok else "FAIL"
        results.append((ep, elapsed_ms, ok))
        print(f"  [{status:4s}] {elapsed_ms:8.1f} ms  {ep}")
        if not ok:
            print(f"          Error: {info}")

    latencies = [r[1] for r in results if r[2]]
    if latencies:
        latencies.sort()
        p50 = latencies[len(latencies) // 2]
        p95 = latencies[int(len(latencies) * 0.95)]
        print(f"\n  P50 latency:  {p50:.1f} ms")
        print(f"  P95 latency:  {p95:.1f} ms")
        print(f"  Success rate: {len(latencies)}/{len(ENDPOINTS)}")

        pass_p50 = p50 <= THRESHOLD_API_P50_MS
        pass_p95 = p95 <= THRESHOLD_API_P95_MS
        print(f"\n  P50 {'PASS' if pass_p50 else 'FAIL'} (threshold: {THRESHOLD_API_P50_MS} ms)")
        print(f"  P95 {'PASS' if pass_p95 else 'FAIL'} (threshold: {THRESHOLD_API_P95_MS} ms)")
        return pass_p50 and pass_p95 and len(latencies) >= len(ENDPOINTS) * 0.8

    print("  No successful requests")
    return False


def bench_pipeline():
    print("\n" + "=" * 60)
    print("Benchmark: Pipeline Throughput")
    print("=" * 60)

    if not VIOLATIONS_CSV.exists():
        print(f"  FAIL — violations CSV not found: {VIOLATIONS_CSV}")
        return False
    if not COORDS_JSON.exists():
        print(f"  FAIL — coords JSON not found: {COORDS_JSON}")
        return False

    import subprocess

    start = time.perf_counter()
    result = subprocess.run(
        [sys.executable, str(PIPELINE_SCRIPT)],
        capture_output=True, text=True, timeout=THRESHOLD_PIPELINE_SEC + 30,
        cwd=str(REPO_ROOT),
    )
    elapsed = time.perf_counter() - start

    passed = result.returncode == 0
    print(f"  {'OK' if passed else 'FAIL'}  {elapsed:.1f}s  returncode={result.returncode}")

    if not passed:
        for line in result.stderr.splitlines()[-5:]:
            print(f"    stderr: {line}")

    print(f"  Threshold: {THRESHOLD_PIPELINE_SEC}s")
    print(f"  {'PASS' if passed and elapsed <= THRESHOLD_PIPELINE_SEC else 'FAIL'}")
    return passed and elapsed <= THRESHOLD_PIPELINE_SEC


def bench_concurrent():
    print("\n" + "=" * 60)
    print("Benchmark: Concurrent Load")
    print("=" * 60)

    import threading

    import random
    N_REQUESTS = 100
    N_CONCURRENT = 10
    results = []
    lock = threading.Lock()

    def worker():
        for _ in range(N_REQUESTS // N_CONCURRENT):
            ep = random.choice(ENDPOINTS)
            elapsed_ms, ok, _ = fetch(ep)
            with lock:
                results.append((ep, elapsed_ms, ok))

    threads = []
    for _ in range(N_CONCURRENT):
        t = threading.Thread(target=worker, daemon=True)
        threads.append(t)

    start = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    total_time = time.perf_counter() - start

    success_count = sum(1 for _, _, ok in results if ok)
    total_count = len(results)
    rate = success_count / total_count if total_count > 0 else 0

    print(f"  Requests: {total_count} ({N_CONCURRENT} concurrent × {N_REQUESTS // N_CONCURRENT} per worker)")
    print(f"  Total time: {total_time:.1f}s")
    print(f"  Throughput: {total_count / total_time:.0f} req/s")
    print(f"  Success: {success_count}/{total_count} ({rate * 100:.0f}%)")

    passed = rate >= THRESHOLD_CONCURRENT_PASS
    print(f"  {'PASS' if passed else 'FAIL'} (threshold: {THRESHOLD_CONCURRENT_PASS * 100:.0f}% success)")
    return passed


def main():
    parser = argparse.ArgumentParser(description="DispatchMind benchmark suite")
    parser.add_argument("--api-only", action="store_true", help="Run API latency benchmarks only")
    parser.add_argument("--pipeline", action="store_true", help="Run pipeline throughput benchmark only")
    parser.add_argument("--concurrent", action="store_true", help="Run concurrent load test only")
    args = parser.parse_args()

    all_pass = True

    run_api = args.api_only or not (args.pipeline or args.concurrent)
    run_pipeline = args.pipeline or not (args.api_only or args.concurrent)
    run_concurrent = args.concurrent or not (args.api_only or args.pipeline)

    if run_api:
        all_pass &= bench_api()
    if run_pipeline:
        all_pass &= bench_pipeline()
    if run_concurrent:
        all_pass &= bench_concurrent()

    print("\n" + "=" * 60)
    print(f"Benchmark suite {'ALL PASS' if all_pass else 'SOME FAILED'}")
    print("=" * 60)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
