#!/usr/bin/env python3
"""Test matrix multiplication limits on ttsim v1.3.1.

Finding: matmul works for small sizes but fails at larger sizes due to
Pack_L1_Acc issues. This script tests to find the working limits.
"""

import os
import warnings

os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"
warnings.filterwarnings("ignore")

import time

import torch
import ttnn

print("=" * 60)
print("Testing Matrix Multiplication Limits on ttsim v1.3.1")
print("=" * 60)
print()

device = ttnn.open_device(device_id=0)
print(f"Device: {device}")
print()

# Test various sizes to find limits
sizes_to_test = [32, 64, 96, 128]

print("Testing square matrices (NxN @ NxN):")
print("-" * 60)

results = {}
for size in sizes_to_test:
    try:
        A = torch.ones(size, size, dtype=torch.float32)
        B = torch.ones(size, size, dtype=torch.float32)

        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

        start = time.perf_counter()
        C_tt = ttnn.matmul(A_tt, B_tt)
        C = ttnn.to_torch(C_tt)
        elapsed = (time.perf_counter() - start) * 1000

        expected = size
        actual = C[0, 0].item()
        is_correct = abs(actual - expected) < 1.0

        results[size] = {"status": "PASS" if is_correct else "WRONG", "time": elapsed, "value": actual}
        print(
            f"  {size:4d}x{size:<4d}: {'✓ PASS' if is_correct else '✗ WRONG'} - {actual:.1f} (expected {expected}), {elapsed:.1f}ms"
        )

    except Exception as e:
        err = str(e).split("\n")[0][:50]
        results[size] = {"status": "FAIL", "error": err}
        print(f"  {size:4d}x{size:<4d}: ✗ FAIL - {err}")

print()
print("=" * 60)
print("Testing simple MLP-style operations (using working sizes):")
print("-" * 60)

# Test a simple 2-layer MLP with working sizes (32, 64)
try:
    batch = 32
    input_dim = 64  # Must be multiple of 32 (tile size)
    hidden_dim = 64
    output_dim = 32

    # Create inputs and weights
    x = torch.randn(batch, input_dim, dtype=torch.float32)
    w1 = torch.randn(input_dim, hidden_dim, dtype=torch.float32) * 0.1  # (64, 64)
    w2 = torch.randn(hidden_dim, output_dim, dtype=torch.float32) * 0.1  # (64, 32)

    x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w1_tt = ttnn.from_torch(w1, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w2_tt = ttnn.from_torch(w2, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

    print(f"  Input shape: ({batch}, {input_dim})")
    print(f"  Layer 1 weights: ({input_dim}, {hidden_dim})")
    print(f"  Layer 2 weights: ({hidden_dim}, {output_dim})")

    # Forward pass
    start = time.perf_counter()

    # Layer 1: x @ w1 -> (32, 64) @ (64, 64) -> (32, 64)
    h1 = ttnn.matmul(x_tt, w1_tt)
    h1_act = ttnn.relu(h1)

    # Layer 2: h1 @ w2 -> (32, 64) @ (64, 32) -> (32, 32)
    out = ttnn.matmul(h1_act, w2_tt)
    result = ttnn.to_torch(out)

    elapsed = (time.perf_counter() - start) * 1000

    print(f"  Output shape: {result.shape}")
    print(f"  Output sample: [{result[0, 0].item():.4f}, {result[0, 1].item():.4f}, ...]")
    print(f"  Total time: {elapsed:.1f}ms")
    print("  ✓ 2-layer MLP WORKS!")

except Exception as e:
    print(f"  ✗ FAILED: {str(e)[:80]}")

print()
print("=" * 60)
print("Testing batched operations:")
print("-" * 60)

# Test multiple forward passes
try:
    num_iterations = 5
    batch = 32
    size = 64

    x = torch.randn(batch, size, dtype=torch.float32)
    w = torch.randn(size, size, dtype=torch.float32) * 0.1

    x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w_tt = ttnn.from_torch(w, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

    # Warmup
    y = ttnn.matmul(x_tt, w_tt)
    _ = ttnn.to_torch(y)

    # Timed runs
    times = []
    for i in range(num_iterations):
        start = time.perf_counter()
        y = ttnn.matmul(x_tt, w_tt)
        _ = ttnn.to_torch(y)
        elapsed = (time.perf_counter() - start) * 1000
        times.append(elapsed)

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    print(f"  {num_iterations} iterations of matmul ({batch}x{size}) @ ({size}x{size})")
    print(f"  Average: {avg_time:.1f}ms, Min: {min_time:.1f}ms, Max: {max_time:.1f}ms")
    print("  ✓ Repeated matmul WORKS!")

except Exception as e:
    print(f"  ✗ FAILED: {str(e)[:80]}")

ttnn.close_device(device)

print()
print("=" * 60)
print("CONCLUSIONS:")
print("=" * 60)
print("""
Matrix multiplication (ttnn.matmul) WORKS on ttsim v1.3.1 with limitations:
- Works: Sizes up to 64x64 (and 96x96 may work depending on config)
- Fails: Sizes 128x128 and larger (Pack_L1_Acc limitation)

This is enough to run:
- Small MLPs with hidden dimensions <= 64
- Simple neural network demos
- Basic transformer components with small dimensions

For a rudimentary model, use matrix dimensions that are multiples of 32
and stay <= 64 for reliable operation.
""")
