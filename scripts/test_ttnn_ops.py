#!/usr/bin/env python3
"""Test which ttnn operations work on ttsim."""

import os
import warnings

# Suppress logging
os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"
warnings.filterwarnings("ignore")

import torch
import ttnn

device = ttnn.open_device(device_id=0)


def make_tensor(vals):
    """Create a ttnn tensor from values."""
    return ttnn.from_torch(torch.ones(32, 32) * vals, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)


def make_random():
    """Create a random ttnn tensor."""
    return ttnn.from_torch(torch.randn(32, 32), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)


# Operations to test: (name, function, expected_value_description)
ops_to_test = [
    # Basic arithmetic
    ("add", lambda: ttnn.add(make_tensor(1), make_tensor(2)), "1+2=3"),
    ("subtract", lambda: ttnn.subtract(make_tensor(5), make_tensor(2)), "5-2=3"),
    ("multiply", lambda: ttnn.multiply(make_tensor(2), make_tensor(3)), "2*3=6"),
    ("neg", lambda: ttnn.neg(make_tensor(5)), "neg(5)=-5"),
    ("abs", lambda: ttnn.abs(make_tensor(-5)), "abs(-5)=5"),
    ("reciprocal", lambda: ttnn.reciprocal(make_tensor(2)), "1/2=0.5"),
    ("sign", lambda: ttnn.sign(make_tensor(-3)), "sign(-3)=-1"),
    # Math functions
    ("sqrt", lambda: ttnn.sqrt(make_tensor(4)), "sqrt(4)=2"),
    ("rsqrt", lambda: ttnn.rsqrt(make_tensor(4)), "1/sqrt(4)=0.5"),
    ("square", lambda: ttnn.square(make_tensor(3)), "3^2=9"),
    ("exp", lambda: ttnn.exp(make_tensor(1)), "exp(1)=2.718"),
    ("log", lambda: ttnn.log(make_tensor(2.718)), "log(e)=1"),
    ("sin", lambda: ttnn.sin(make_tensor(0)), "sin(0)=0"),
    ("cos", lambda: ttnn.cos(make_tensor(0)), "cos(0)=1"),
    # Activation functions
    ("relu", lambda: ttnn.relu(make_tensor(-1)), "relu(-1)=0"),
    ("sigmoid", lambda: ttnn.sigmoid(make_tensor(0)), "sigmoid(0)=0.5"),
    ("tanh", lambda: ttnn.tanh(make_tensor(0)), "tanh(0)=0"),
    ("gelu", lambda: ttnn.gelu(make_tensor(1)), "gelu(1)=0.841"),
    ("silu", lambda: ttnn.silu(make_tensor(1)), "silu(1)=0.731"),
    ("elu", lambda: ttnn.elu(make_tensor(-1)), "elu(-1)=-0.632"),
    ("softplus", lambda: ttnn.softplus(make_tensor(0)), "softplus(0)=0.693"),
    # Element-wise comparison/selection
    ("maximum", lambda: ttnn.maximum(make_tensor(3), make_tensor(5)), "max(3,5)=5"),
    ("minimum", lambda: ttnn.minimum(make_tensor(3), make_tensor(5)), "min(3,5)=3"),
    # Other
    ("clone", lambda: ttnn.clone(make_tensor(5)), "clone(5)=5"),
]

print("Testing ttnn operations on ttsim...")
print("=" * 60)

working_ops = []
failed_ops = []

for name, op_fn, expected in ops_to_test:
    try:
        result = op_fn()
        out = ttnn.to_torch(result)
        val = out[0, 0].item()
        print(f"OK:   {name:12} -> {val:8.4f}  ({expected})")
        working_ops.append((name, expected))
    except Exception as e:
        err = str(e).split("\n")[0][:50]
        print(f"FAIL: {name:12} -> {err}")
        failed_ops.append(name)

ttnn.close_device(device)

print("\n" + "=" * 60)
print(f"Working operations ({len(working_ops)}):")
for name, _ in working_ops:
    print(f"  - {name}")

print(f"\nFailed operations ({len(failed_ops)}):")
for name in failed_ops:
    print(f"  - {name}")
