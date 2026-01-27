#!/bin/bash
# Development setup script for Tenstorrent Simulator Playground
# Run this from the project root in WSL2

set -e

echo "=== Tenstorrent Simulator Playground Setup ==="

# Check if running in WSL
if ! grep -q microsoft /proc/version 2>/dev/null; then
    echo "Warning: This script is designed for WSL2"
fi

# ============================================
# Phase 1: System Dependencies
# ============================================
echo ""
echo "=== Installing System Dependencies ==="
sudo apt update
sudo apt install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    wget \
    curl \
    python3 \
    python3-pip \
    python3-venv

# ============================================
# Phase 2: Install uv
# ============================================
echo ""
echo "=== Installing uv ==="
if command -v uv &> /dev/null; then
    echo "uv already installed: $(uv --version)"
else
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

# ============================================
# Phase 3: Install ttnn and PyTorch
# ============================================
echo ""
echo "=== Installing ttnn and PyTorch ==="
pip3 install ttnn torch --break-system-packages --index-url https://download.pytorch.org/whl/cpu

# ============================================
# Phase 4: Clone tt-metal for SOC descriptors
# ============================================
echo ""
echo "=== Setting up TT-Metal ==="
if [ ! -d "$HOME/tt-metal" ]; then
    git clone --depth 1 https://github.com/tenstorrent/tt-metal.git ~/tt-metal
fi
export TT_METAL_HOME=~/tt-metal

# ============================================
# Phase 5: Download ttsim
# ============================================
echo ""
echo "=== Downloading ttsim Simulator ==="
TTSIM_VERSION="v1.3.1"
mkdir -p ~/ttsim
cd ~/ttsim

if [ ! -f "libttsim_wh.so" ]; then
    wget -q https://github.com/tenstorrent/ttsim/releases/download/${TTSIM_VERSION}/libttsim_wh.so
    echo "Downloaded Wormhole simulator"
fi

if [ ! -f "libttsim_bh.so" ]; then
    wget -q https://github.com/tenstorrent/ttsim/releases/download/${TTSIM_VERSION}/libttsim_bh.so
    echo "Downloaded Blackhole simulator"
fi

# Copy SOC descriptor (required)
cp $TT_METAL_HOME/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml ~/ttsim/soc_descriptor.yaml
echo "Copied SOC descriptor"

# ============================================
# Phase 5.5: Install SFPI
# ============================================
echo ""
echo "=== Installing SFPI Firmware ==="
SFPI_VERSION="7.17.0"
if [ ! -d "/opt/tenstorrent/sfpi" ]; then
    wget -q https://github.com/tenstorrent/sfpi/releases/download/${SFPI_VERSION}/sfpi_${SFPI_VERSION}_x86_64_debian.deb -O /tmp/sfpi.deb
    sudo dpkg -i /tmp/sfpi.deb
    rm /tmp/sfpi.deb
    echo "SFPI installed"
else
    echo "SFPI already installed"
fi

# ============================================
# Phase 6: Set Environment Variables
# ============================================
echo ""
echo "=== Configuring Environment ==="
BASHRC_MARKER="# Tenstorrent Playground Environment"
if ! grep -q "$BASHRC_MARKER" ~/.bashrc; then
    cat >> ~/.bashrc << 'EOF'

# Tenstorrent Playground Environment
export TT_METAL_HOME=~/tt-metal
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1
EOF
    echo "Added environment variables to ~/.bashrc"
fi

# Export for current session
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1

# ============================================
# Phase 7: Verify Installation
# ============================================
echo ""
echo "=== Verifying Installation ==="

python3 << 'PYEOF'
import sys
try:
    import ttnn
    print(f"✓ ttnn imported successfully")
except ImportError as e:
    print(f"✗ Failed to import ttnn: {e}")
    sys.exit(1)

try:
    import torch
    print(f"✓ torch imported successfully")
except ImportError as e:
    print(f"✗ Failed to import torch: {e}")
    sys.exit(1)

print("")
print("=== Environment Summary ===")
import os
print(f"TT_METAL_HOME: {os.environ.get('TT_METAL_HOME', 'NOT SET')}")
print(f"TT_METAL_SIMULATOR: {os.environ.get('TT_METAL_SIMULATOR', 'NOT SET')}")
print(f"TT_METAL_SLOW_DISPATCH_MODE: {os.environ.get('TT_METAL_SLOW_DISPATCH_MODE', 'NOT SET')}")
PYEOF

echo ""
echo "=== Testing Simulator ==="
python3 << 'PYEOF'
import ttnn
import os

try:
    device = ttnn.open_device(device_id=0)
    print(f"✓ Device opened: {device}")
    ttnn.close_device(device)
    print("✓ Simulator is working!")
except Exception as e:
    print(f"✗ Simulator error: {e}")
PYEOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Environment is ready! To test tensor operations:"
echo "  bash scripts/test_simulator.sh"
echo ""
echo "To start the backend (after implementation):"
echo "  cd backend && uv run uvicorn playground.main:app --reload"
echo ""
echo "To start the frontend (in Windows, after implementation):"
echo "  cd frontend && npm run dev"
