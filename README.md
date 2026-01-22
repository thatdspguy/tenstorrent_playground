# Tenstorrent Simulator Playground

A web-based playground demonstrating Tenstorrent developer tooling using a hardware-free simulator.

![Status](https://img.shields.io/badge/status-working-brightgreen)
![Python](https://img.shields.io/badge/python-3.12+-blue)
![React](https://img.shields.io/badge/react-19-61dafb)
![ttsim](https://img.shields.io/badge/ttsim-1.3.0-purple)

## Overview

This project provides:
- A **React-based frontend** for selecting models and viewing performance metrics
- A **FastAPI backend** for running simulations and returning results
- Integration with **ttsim** (Tenstorrent simulator) for hardware-free execution

### Features

- 🚀 **Real Simulation**: Run actual TTNN operations on the ttsim simulator
- 📊 **Performance Metrics**: Latency, throughput, memory usage with visualizations
- 🔄 **Hardware Comparison**: See expected silicon performance vs simulation
- 🎨 **Modern UI**: Dark theme with Tenstorrent brand colors
- ⚡ **Multiple Models**: MNIST MLP, LeNet CNN, Matrix operations

## Screenshots

The playground shows model selection, parameter configuration, and real-time results:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔲 Tenstorrent Simulator Playground     ● Simulator Ready       │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐  ┌──────────────────────────────────────────┐ │
│ │ Select Model  │  │ Performance Results                      │ │
│ │               │  │                                          │ │
│ │ [MNIST MLP]   │  │ Latency: 1.86ms   Throughput: 538/sec   │ │
│ │ [LeNet CNN]   │  │ Memory: 10.5MB    Speedup: 100×         │ │
│ │ [MatMul]      │  │                                          │ │
│ │ [Add] ✓       │  │ ▓▓▓▓▓▓▓▓  Simulated vs Silicon          │ │
│ │               │  │                                          │ │
│ │ Parameters    │  │ Output: [3.0, 3.0]                       │ │
│ │ Size: [32]    │  │                                          │ │
│ │ Iters: [10]   │  └──────────────────────────────────────────┘ │
│ │               │                                               │
│ │ [Run Sim]     │                                               │
│ └───────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
tenstorrent_playground/
├── backend/                 # FastAPI backend
│   ├── src/playground/
│   │   ├── api/routes.py   # API endpoints
│   │   ├── services/
│   │   │   ├── simulator.py      # WSL2/ttsim integration
│   │   │   └── model_registry.py # Available models
│   │   └── models/schemas.py     # Pydantic schemas
│   └── pyproject.toml
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── api/           # TypeScript API client
│   │   └── App.tsx        # Main application
│   └── package.json
├── external/
│   └── tt-metal/          # Tenstorrent SDK (submodule)
├── scripts/
│   ├── setup.sh           # WSL2 setup script
│   └── test_simulator.sh  # Simulator verification
└── docs/                   # Documentation
```

## Quick Start

### Prerequisites

- **Windows 11** with WSL2 (Ubuntu 22.04)
- **Python 3.12+** (via [uv](https://github.com/astral-sh/uv))
- **Node.js 20+**
- **Git**

### 1. WSL2 Setup (One-time)

In WSL2 Ubuntu, install ttsim and dependencies:

```bash
# Install ttnn
pip3 install ttnn --break-system-packages

# Download ttsim
mkdir -p ~/ttsim && cd ~/ttsim
wget https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_wh.so

# Install SFPI firmware
wget https://github.com/tenstorrent/tt-metal/releases/download/v0.65.0-rc7/sfpi_7.17.0_x86_64_debian.deb
sudo dpkg -i sfpi_7.17.0_x86_64_debian.deb

# Clone tt-metal for SOC descriptors
git clone --depth 1 https://github.com/tenstorrent/tt-metal.git ~/tt-metal

# Install PyTorch CPU
pip3 install torch --break-system-packages --index-url https://download.pytorch.org/whl/cpu

# Verify installation
export TT_METAL_HOME=~/tt-metal
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1
python3 -c "import ttnn; d=ttnn.open_device(0); print('OK'); ttnn.close_device(d)"
```

### 2. Clone Repository

```bash
git clone --recurse-submodules https://github.com/yourusername/tenstorrent_playground.git
cd tenstorrent_playground
```

### 3. Backend Setup

```bash
cd backend
uv sync  # Install dependencies
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn playground.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check with simulator status |
| `/api/models` | GET | List available models |
| `/api/models/{id}` | GET | Get model details |
| `/api/simulate` | POST | Run a simulation |
| `/api/simulate/{job_id}` | GET | Get job status |
| `/api/jobs` | GET | List recent jobs |

### Example: Run Simulation

```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"model_id": "add_benchmark", "iterations": 10}'
```

## Available Models

| Model | Architecture | Description |
|-------|--------------|-------------|
| `mnist_mlp` | MLP | 3-layer network: 784→128→64→10 |
| `lenet_cnn` | CNN | LeNet-5 inspired conv network |
| `matmul_benchmark` | Benchmark | Matrix multiplication (NxN) |
| `add_benchmark` | Benchmark | Element-wise addition (verified working) |

## Development

### Running Tests

```bash
# Backend
cd backend
uv run pytest

# Frontend
cd frontend
npm run test
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend (no build needed, runs directly)
```

## Technology Stack

- **Backend**: FastAPI, uvicorn, pydantic, Python 3.13
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Chart.js
- **Simulator**: ttsim 1.3.0, ttnn 0.65.0, PyTorch CPU
- **Platform**: Windows + WSL2 Ubuntu

## Troubleshooting

### Simulator not found
Ensure WSL2 environment variables are set:
```bash
export TT_METAL_HOME=~/tt-metal
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1
```

### SFPI not found
Install the SFPI firmware package as shown in setup.

### Backend can't connect to WSL
Check WSL distro name in `backend/src/playground/config.py` matches your system.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Use conventional commits (e.g., `feat:`, `fix:`, `docs:`)
4. Submit a pull request

## License

MIT

## Acknowledgments

- [Tenstorrent](https://tenstorrent.com/) for tt-metal and ttsim
- [ttsim](https://github.com/tenstorrent/ttsim) hardware simulator
