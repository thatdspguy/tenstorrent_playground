#!/usr/bin/env python3
"""Test how matrix size affects latency."""

import os

os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"

import time

import torch
import ttnn

device = ttnn.open_device(device_id=0)

print("Testing matrix size vs latency (sigmoid):")
print("=" * 50)

for size in [32, 64, 128, 256]:
    A = torch.zeros(size, size)
    A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

    # Warmup
    B_tt = ttnn.sigmoid(A_tt)
    _ = ttnn.to_torch(B_tt)

    # Time 10 iterations
    start = time.perf_counter()
    for _ in range(10):
        B_tt = ttnn.sigmoid(A_tt)
        result = ttnn.to_torch(B_tt)
    end = time.perf_counter()

    latency = (end - start) * 1000 / 10
    elements = size * size
    print(f"Size {size:3}x{size:3} ({elements:6} elements): {latency:.2f} ms/iter")

print("\n" + "=" * 50)
print("Testing iteration count effect:")

size = 128
A = torch.zeros(size, size)
A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

for iters in [1, 5, 10, 50, 100]:
    # Warmup
    B_tt = ttnn.sigmoid(A_tt)
    _ = ttnn.to_torch(B_tt)

    start = time.perf_counter()
    for _ in range(iters):
        B_tt = ttnn.sigmoid(A_tt)
        result = ttnn.to_torch(B_tt)
    end = time.perf_counter()

    total = (end - start) * 1000
    latency = total / iters
    print(f"Iterations {iters:3}: total={total:7.2f}ms, latency={latency:.2f} ms/iter")

ttnn.close_device(device)
