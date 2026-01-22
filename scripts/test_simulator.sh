#!/bin/bash
# Test script for ttsim simulator

export TT_METAL_HOME=~/tt-metal
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1
export PATH=$HOME/.local/bin:$PATH

echo "=== Environment ==="
echo "TT_METAL_HOME: $TT_METAL_HOME"
echo "TT_METAL_SIMULATOR: $TT_METAL_SIMULATOR"
echo "TT_METAL_SLOW_DISPATCH_MODE: $TT_METAL_SLOW_DISPATCH_MODE"
echo ""

echo "=== Testing ttnn import ==="
python3 << 'PYEOF'
import ttnn
print(f"ttnn imported successfully!")
PYEOF

echo ""
echo "=== Testing device open (simulator) ==="
python3 << 'PYEOF'
import ttnn
import os

print("Attempting to open device with simulator...")
print(f"Simulator path: {os.environ.get('TT_METAL_SIMULATOR', 'NOT SET')}")

try:
    device = ttnn.open_device(device_id=0)
    print(f"SUCCESS! Device opened: {device}")
    print(f"Device ID: {device.id()}")
    ttnn.close_device(device)
    print("Device closed successfully")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
PYEOF

echo ""
echo "=== Testing simple tensor operation ==="
python3 << 'PYEOF'
import ttnn
import torch

print("Opening device...")
device = ttnn.open_device(device_id=0)

print("Creating tensors...")
a = torch.ones((32, 32))
b = torch.ones((32, 32)) * 2

print("Converting to TTNN tensors...")
a_tt = ttnn.from_torch(a, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
b_tt = ttnn.from_torch(b, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

print("Performing addition on simulated device...")
c_tt = ttnn.add(a_tt, b_tt)

print("Converting back to torch...")
c = ttnn.to_torch(c_tt)

print(f"Result shape: {c.shape}")
print(f"Expected value: 3.0, Got: {c[0,0].item():.1f}")

ttnn.close_device(device)
print("SUCCESS! Tensor operation completed on simulator!")
PYEOF
