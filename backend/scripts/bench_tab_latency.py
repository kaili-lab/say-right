#!/usr/bin/env python3
"""Tab 首屏加载延迟基准测试。

用法：
  1. 启动后端：uvicorn app.main:app
  2. 运行基准：python scripts/bench_tab_latency.py

要求：
  - 需要一个已注册用户的 email/password（通过环境变量传入）
  - 后端连接真实 PostgreSQL

环境变量：
  BENCH_BASE_URL  默认 http://localhost:8000
  BENCH_EMAIL     测试用户邮箱
  BENCH_PASSWORD  测试用户密码
"""

from __future__ import annotations

import os
import statistics
import sys
import time

import httpx

BASE_URL = os.getenv("BENCH_BASE_URL", "http://localhost:8000")
EMAIL = os.getenv("BENCH_EMAIL", "")
PASSWORD = os.getenv("BENCH_PASSWORD", "")

WARMUP_ROUNDS = 3
SAMPLE_ROUNDS = 20

ENDPOINTS = [
    "/decks",
    "/review/decks",
    "/dashboard/home-summary",
]


def login(client: httpx.Client) -> str:
    """登录并返回 access_token。"""
    resp = client.post(
        f"{BASE_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
    )
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}", file=sys.stderr)
        sys.exit(1)
    return resp.json()["access_token"]


def bench_endpoint(
    client: httpx.Client,
    path: str,
    headers: dict[str, str],
) -> list[float]:
    """对单个端点做预热 + 采样，返回采样耗时列表（毫秒）。"""
    url = f"{BASE_URL}{path}"

    # 预热
    for _ in range(WARMUP_ROUNDS):
        resp = client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"  [WARN] {path} returned {resp.status_code}", file=sys.stderr)

    # 采样
    latencies: list[float] = []
    for _ in range(SAMPLE_ROUNDS):
        start = time.perf_counter()
        resp = client.get(url, headers=headers)
        elapsed_ms = (time.perf_counter() - start) * 1000
        latencies.append(elapsed_ms)
        if resp.status_code != 200:
            print(f"  [WARN] {path} returned {resp.status_code}", file=sys.stderr)

    return latencies


def percentile(data: list[float], pct: float) -> float:
    """计算百分位数。"""
    sorted_data = sorted(data)
    idx = (len(sorted_data) - 1) * pct / 100
    lower = int(idx)
    upper = lower + 1
    if upper >= len(sorted_data):
        return sorted_data[-1]
    weight = idx - lower
    return sorted_data[lower] * (1 - weight) + sorted_data[upper] * weight


def main() -> None:
    if not EMAIL or not PASSWORD:
        print(
            "Error: BENCH_EMAIL and BENCH_PASSWORD must be set.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Base URL: {BASE_URL}")
    print(f"Warmup: {WARMUP_ROUNDS} rounds, Sample: {SAMPLE_ROUNDS} rounds")
    print()

    with httpx.Client(timeout=30.0) as client:
        token = login(client)
        headers = {"Authorization": f"Bearer {token}"}

        print(f"{'Endpoint':<30} {'Avg (ms)':>10} {'P50 (ms)':>10} {'P95 (ms)':>10} {'Min (ms)':>10} {'Max (ms)':>10}")
        print("-" * 80)

        for path in ENDPOINTS:
            latencies = bench_endpoint(client, path, headers)
            avg = statistics.mean(latencies)
            p50 = percentile(latencies, 50)
            p95 = percentile(latencies, 95)
            mn = min(latencies)
            mx = max(latencies)
            print(f"{path:<30} {avg:>10.0f} {p50:>10.0f} {p95:>10.0f} {mn:>10.0f} {mx:>10.0f}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
