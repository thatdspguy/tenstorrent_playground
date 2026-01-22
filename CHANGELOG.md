# Changelog

All notable changes to the Tenstorrent Simulator Playground will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-22

### Added

- **Web-based Playground UI**
  - React 19 frontend with TypeScript and Vite
  - Dark theme with Tenstorrent brand colors
  - Interactive model selection with visual icons
  - Real-time simulation progress indicators

- **Simulation Backend**
  - FastAPI-powered REST API
  - Real TTNN operations via ttsim hardware simulator
  - Support for Wormhole architecture simulation
  - Configurable batch size and matrix size parameters

- **12 Benchmark Models**
  - Arithmetic: Add, Subtract, Multiply
  - Math: Exp, Log, Sqrt
  - Activation: ReLU, Sigmoid, Tanh, GELU
  - Pipeline: Chain (multiple operations)

- **Parameter Sweeps**
  - 1D and 2D parameter sweep support
  - Fixed/Range toggle for each parameter
  - Linear and logarithmic scaling options
  - Configurable sweep points

- **Visualization**
  - Dual chart layout (Latency + Throughput)
  - Chart.js interactive line charts
  - Multi-series comparison by parameter
  - Output verification display

- **Docker Support**
  - Full Docker Compose setup with ttsim included
  - Native Linux simulation in container
  - Frontend served via nginx
  - Health check endpoints

- **Developer Experience**
  - PowerShell setup script for Windows
  - Bash development scripts
  - Comprehensive README with multiple setup options
  - Environment configuration via .env files

### Technical Details

- Backend: Python 3.12+, FastAPI, Pydantic, uvicorn
- Frontend: React 19, TypeScript 5, Vite 7, Tailwind CSS 4
- Simulator: ttsim 1.3.0, ttnn 0.65.0, PyTorch CPU
- Container: Docker with multi-stage builds

---

[1.0.0]: https://github.com/tenstorrent/tenstorrent_playground/releases/tag/v1.0.0
