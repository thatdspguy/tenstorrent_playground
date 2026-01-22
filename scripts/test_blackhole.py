#!/usr/bin/env python3
"""Test script for Blackhole simulator."""

import os
import sys

# Suppress logging
os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"

import time

import torch
import ttnn

print("Testing Blackhole simulator...")

try:
    print("Opening device...")
    device = ttnn.open_device(device_id=0)
    print("Device opened successfully!")

    # Simple tensor test
    print("Creating tensor...")
    A = torch.ones(32, 32) * 2.0
    A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    print("Tensor created on device")

    # Test add operation
    print("Testing add operation...")
    B = torch.ones(32, 32) * 3.0
    B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

    start = time.perf_counter()
    C_tt = ttnn.add(A_tt, B_tt)
    result = ttnn.to_torch(C_tt)
    end = time.perf_counter()

    print(f"Add result: {result[0, 0].item()} (expected: 5.0)")
    print(f"Latency: {(end - start) * 1000:.2f} ms")

    ttnn.close_device(device)
    print("SUCCESS - Blackhole simulator working!")

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
