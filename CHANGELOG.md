# Changelog

All notable changes to the Tenstorrent Simulator Playground will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-22

### Added

- **Blackhole Architecture Support**
  - Added support for Tenstorrent Blackhole architecture simulation
  - New simulator selector dropdown in the UI header
  - Per-simulator availability indicators (✓/✗) showing which architectures are ready
  - Dynamic SOC descriptor switching when changing architectures
  - Both `libttsim_wh.so` (Wormhole) and `libttsim_bh.so` (Blackhole) now included

- **Enhanced Visualization Options**
  - New Chart Settings panel for configuring visualization
  - Three visualization types: 2D Line, 3D Surface, and Heatmap
  - Three themed color schemes: Violet, Ocean (Viridis), and Sunset (Plasma)
  - Toggle for legend visibility
  - Line charts use colors matching their 3D colorscale themes

- **Enhanced Health API**
  - `/api/health` endpoint now returns detailed simulator availability per chip
  - New `simulators` array in health response with individual chip status
  - Better error messages when a specific simulator is unavailable

- **Improved Setup Scripts**
  - `setup.ps1` now downloads both Wormhole and Blackhole simulators
  - Automatic SOC descriptor setup for both architectures
  - Added `test_blackhole.py` script for simulator verification

### Changed

- **UI Updates**
  - Browser tab title changed to "TTSim Playground"
  - Header subtitle changed to "Explore AI workloads on simulated Tenstorrent hardware"
  - Simulator status moved to dropdown selector with visual indicators
  - Run button now checks availability of selected chip specifically

- **Smart Parameter Defaults**
  - Parameter 1 (Matrix Size): Defaults to Range Mode, Start=2, Stop=128, Points=7, Log Scale
  - Parameter 2 (Batch Size): Defaults to Range Mode, Start=2, Stop=128, Points=7, Log Scale
  - X-axis explicitly prefers `matrix_size`, Y-axis prefers `batch_size`
  - Parameter settings (mode, start, end, numPoints, scale) now persist when switching models
  - Only parameter names update to find matching parameters in the new model

- **Backend Configuration**
  - Renamed `tt_metal_simulator` to `tt_metal_simulator_wh` and `tt_metal_simulator_bh`
  - Added `get_simulator_path(chip)` and `get_soc_descriptor(chip)` helper methods
  - Simulation requests now properly route to the correct simulator based on `chip` parameter

- **Docker Configuration**
  - Dockerfile now downloads both simulator libraries
  - Both SOC descriptors included in container
  - Environment variables updated for dual-simulator support

### Fixed

- Fixed Blackhole simulator returning 0 latency/throughput due to incorrect SOC descriptor
- Backend now copies the correct SOC descriptor before each simulation
- Fixed initial parameter defaults where Parameter 1 incorrectly defaulted to Batch Size
- Fixed chart settings panel overflow and toggle positioning issues

### Technical Details

- Backend: Added `SimulatorAvailability` schema for per-chip status reporting
- Frontend: New `SimulatorSelector` component with dropdown and status indicators
- Frontend: New `ChartConfigPanel` component with Plotly.js integration for 3D/heatmap
- Docker: Image size slightly increased (~166KB) for additional Blackhole simulator

---

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

[1.1.0]: https://github.com/tenstorrent/tenstorrent_playground/releases/tag/v1.1.0
[1.0.0]: https://github.com/tenstorrent/tenstorrent_playground/releases/tag/v1.0.0
