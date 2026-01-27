#!/usr/bin/env python3
"""Test matrix multiplication (matmul) on ttsim v1.3.1.

This script tests whether the ttnn.matmul operation works on the ttsim simulator.
Matrix multiplication is essential for neural networks - it's the core operation
in linear layers, attention mechanisms, and most model architectures.

The v1.3.1 release notes mention:
- "Added support for packer L1 accumulate in Tensix, with bit accuracy validated on WH"
- Various Tensix ISA improvements

This may have enabled or improved matmul support.
"""

import os
import warnings

# Suppress logging
os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"
warnings.filterwarnings("ignore")

import time

import torch
import ttnn

print("=" * 60)
print("Testing Matrix Multiplication on ttsim v1.3.1")
print("=" * 60)
print()

# Open device
print("Opening device...")
device = ttnn.open_device(device_id=0)
print(f"Device opened: {device}")
print()

# Test configurations to try
test_cases = [
    # (M, K, N) - standard matrix dimensions for A(M,K) @ B(K,N) = C(M,N)
    (32, 32, 32),  # Small square
    (64, 64, 64),  # Medium square
    (128, 128, 128),  # Larger square
    (32, 64, 32),  # Non-square
]

print("Testing ttnn.matmul with different matrix sizes...")
print("-" * 60)

working_configs = []
failed_configs = []

for M, K, N in test_cases:
    print(f"\nTest: A({M}x{K}) @ B({K}x{N}) = C({M}x{N})")

    try:
        # Create test matrices
        # For verification: use simple values
        # A is all 1s, B is all 1s -> result should be K (the inner dimension)
        A = torch.ones(M, K, dtype=torch.float32)
        B = torch.ones(K, N, dtype=torch.float32)
        expected = K  # Each element of C should equal K (sum of K ones)

        # Convert to ttnn tensors
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

        # Perform matrix multiplication
        start = time.perf_counter()
        C_tt = ttnn.matmul(A_tt, B_tt)
        C = ttnn.to_torch(C_tt)
        elapsed = (time.perf_counter() - start) * 1000

        # Verify result
        actual = C[0, 0].item()
        is_correct = abs(actual - expected) < 1.0  # bfloat16 has limited precision

        print(f"  Result shape: {C.shape}")
        print(f"  Expected value: {expected}, Got: {actual:.2f}")
        print(f"  Correct: {'YES' if is_correct else 'NO'}")
        print(f"  Time: {elapsed:.2f}ms")

        if is_correct:
            working_configs.append((M, K, N))
            print("  ✓ PASSED")
        else:
            failed_configs.append((M, K, N, "Incorrect result"))
            print("  ✗ INCORRECT RESULT")

    except Exception as e:
        err = str(e).split("\n")[0][:80]
        print(f"  ✗ FAILED: {err}")
        failed_configs.append((M, K, N, str(e)))

print()
print("=" * 60)
print("Testing ttnn.linear (Linear layer = matmul + bias)...")
print("-" * 60)

linear_tests = [
    (32, 64, 32),  # in_features=64, out_features=32, batch=32
    (16, 32, 16),  # Smaller
]

for batch, in_features, out_features in linear_tests:
    print(f"\nTest: Linear({in_features} -> {out_features}), batch={batch}")

    try:
        # Input: (batch, in_features)
        # Weight: (out_features, in_features)
        # Bias: (out_features,)
        x = torch.ones(batch, in_features, dtype=torch.float32)
        weight = torch.ones(out_features, in_features, dtype=torch.float32)
        bias = torch.zeros(out_features, dtype=torch.float32)

        # Convert to ttnn
        x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        weight_tt = ttnn.from_torch(weight, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        bias_tt = ttnn.from_torch(bias.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

        # Perform linear: y = x @ weight.T + bias
        start = time.perf_counter()
        # ttnn.linear expects weight to be transposed
        y_tt = ttnn.linear(x_tt, weight_tt, bias=bias_tt)
        y = ttnn.to_torch(y_tt)
        elapsed = (time.perf_counter() - start) * 1000

        # Verify: with weight=1, bias=0, result should be in_features
        expected = in_features
        actual = y[0, 0].item()
        is_correct = abs(actual - expected) < 2.0

        print(f"  Result shape: {y.shape}")
        print(f"  Expected value: {expected}, Got: {actual:.2f}")
        print(f"  Time: {elapsed:.2f}ms")

        if is_correct:
            print("  ✓ PASSED")
            working_configs.append(("linear", batch, in_features, out_features))
        else:
            print("  ✗ INCORRECT RESULT")

    except Exception as e:
        err = str(e).split("\n")[0][:80]
        print(f"  ✗ FAILED: {err}")

print()
print("=" * 60)
print("Testing basic matmul patterns for neural networks...")
print("-" * 60)

# Test a simple MLP-like pattern: input -> linear -> activation -> linear
print("\nTest: Simple MLP pattern (Linear -> ReLU -> Linear)")

try:
    batch_size = 32
    input_dim = 64
    hidden_dim = 32
    output_dim = 16

    # Input
    x = torch.randn(batch_size, input_dim, dtype=torch.float32)

    # Weights (random)
    w1 = torch.randn(hidden_dim, input_dim, dtype=torch.float32) * 0.1
    w2 = torch.randn(output_dim, hidden_dim, dtype=torch.float32) * 0.1

    # Convert to ttnn
    x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w1_tt = ttnn.from_torch(w1, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w2_tt = ttnn.from_torch(w2, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

    # Forward pass
    start = time.perf_counter()

    # Layer 1: matmul
    h1_tt = ttnn.matmul(x_tt, ttnn.transpose(w1_tt, -1, -2))

    # Activation
    h1_act_tt = ttnn.relu(h1_tt)

    # Layer 2: matmul
    out_tt = ttnn.matmul(h1_act_tt, ttnn.transpose(w2_tt, -1, -2))

    # Back to torch
    out = ttnn.to_torch(out_tt)
    elapsed = (time.perf_counter() - start) * 1000

    print(f"  Input: ({batch_size}, {input_dim})")
    print(f"  Hidden: ({batch_size}, {hidden_dim})")
    print(f"  Output: {out.shape}")
    print(f"  Output sample: [{out[0, 0].item():.4f}, {out[0, 1].item():.4f}, ...]")
    print(f"  Time: {elapsed:.2f}ms")
    print("  ✓ MLP PATTERN WORKS!")

except Exception as e:
    err = str(e)
    print(f"  ✗ FAILED: {err[:100]}")

# Close device
ttnn.close_device(device)

print()
print("=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"Working matmul configs: {len(working_configs)}")
for cfg in working_configs:
    print(f"  ✓ {cfg}")
print(f"Failed configs: {len(failed_configs)}")
for cfg in failed_configs:
    print(f"  ✗ {cfg}")
print()
