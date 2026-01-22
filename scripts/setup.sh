#!/bin/bash
# Development setup script for Tenstorrent Simulator Playground
# Run this from the project root in WSL2

set -e

echo "=== Tenstorrent Simulator Playground Setup ==="

# Check if running in WSL
if ! grep -q microsoft /proc/version 2>/dev/null; then
    echo "Warning: This script is designed for WSL2"
fi

# Backend setup
echo ""
echo "=== Setting up Backend ==="
cd backend
if command -v uv &> /dev/null; then
    uv sync
    echo "Backend dependencies installed"
else
    echo "Error: uv not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Frontend setup
echo ""
echo "=== Setting up Frontend ==="
cd ../frontend
if command -v npm &> /dev/null; then
    npm install
    echo "Frontend dependencies installed"
else
    echo "Error: npm not found. Install Node.js first"
    exit 1
fi

# tt-metal submodule
echo ""
echo "=== Initializing tt-metal submodule ==="
cd ..
git submodule update --init --recursive

echo ""
echo "=== Setup Complete ==="
echo "To start the backend: cd backend && uv run uvicorn playground.main:app --reload"
echo "To start the frontend: cd frontend && npm run dev"
