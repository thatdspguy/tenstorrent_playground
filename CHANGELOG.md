# Changelog

All notable changes to the Tenstorrent Simulator Playground will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-27

### Added

- **Digit Recognition Page**
  - Interactive drawing canvas for handwritten digit input (0-9)
  - Real-time MNIST neural network inference on Tenstorrent simulator
  - Network architecture visualization showing layer activations and connections
  - Performance statistics tracking (average latency and throughput)
  - Confidence display with horizontal bar chart for all 10 digit classes
  - Trained 2-layer MLP model (784→128→10) achieving ~98% accuracy
  - New digit recognition API endpoints (`/api/digit/predict`, `/api/digit/model-info`)

- **Simple 2-Layer MLP Operation**
  - Configurable neural network architecture editor
  - Interactive network diagram showing input, hidden, and output layers
  - Configurable sizes: input (32/64), hidden (32/64), output (16/32/64), batch (16/32/64)
  - Parameter count display with real-time updates
  - Visual representation of layer connections and ReLU activation

- **Matrix Multiplication Operation**
  - Support for 32×32 and 64×64 matrix operations
  - Optimized for TTNN performance benchmarking
  - Added matrix multiply icon to operation selector

- **React Router Integration**
  - Separate pages for Digit Recognition (/) and Mathematical Operations (/math-operations)
  - Clean URL structure with browser navigation support
  - Navigation sidebar with page links

### Changed

- **UI Redesign**
  - Non-collapsible sidebar with fixed width (256px) for better text display
  - Simplified branding: "TTSim Playground" with chip icon
  - Mathematical Operations page header now matches Digit Recognition style
  - Operation selector reorganized into 4×3 grid by category
  - Updated icons for subtract (circle with line) and matrix multiply (grid with @)

- **Model Registry Reorganization**
  - Removed chain operations (chain_benchmark, chain_gelu_mul)
  - Reordered operations: Arithmetic (Add/Subtract/Multiply/Sqrt), Activations (Sigmoid/Tanh/ReLU/GELU), Advanced (Exp/Log/MatMul/MLP)
  - Matrix multiplication limited to maximum 64×64 size

- **Improved Default Parameters**
  - Parameter 1: start=2, end=32, points=5, scale=logarithmic
  - Parameter 2: start=8, end=128, points=3, scale=logarithmic
  - Iterations default changed from 10 to 50
  - Iterations value now preserved when switching between operations

- **Frontend Dependencies**
  - Updated to React Router v7.13.0 for page routing
  - Added react-router-dom dependency

### Fixed

- Iterations parameter now correctly defaults to 50 and persists across model changes
- Sidebar width increased to prevent "Mathematical Operations" text cutoff

### Documentation

- Updated README with Digit Recognition feature and Pages section
- Added comprehensive documentation for new components (DrawingCanvas, NetworkVisualization, MLPVisualization)
- Updated API reference with digit recognition endpoints
- Refreshed project structure reflecting new pages/ directory and components
- Updated both frontend and backend README files with new features

## [Unreleased]

### Added

- **Matrix Multiplication Support (ttsim v1.3.1)**
  - Upgraded ttsim simulator from v1.3.0 to v1.3.1
  - New "Matrix Multiply (A @ B)" benchmark - true matrix multiplication operation
  - New "Simple 2-Layer MLP" model - Linear(64->64) + ReLU + Linear(64->32)
  - Matrix operations work reliably for sizes up to 64x64 on the simulator
  - Test scripts: `test_matmul.py`, `test_matmul_limits.py`, `test_simple_mlp.py`

### Changed

- Updated all ttsim references from v1.3.0 to v1.3.1 across setup scripts and documentation
- Model registry now includes "Matrix" architecture category for matmul operations

### Notes

- Matrix multiplication (ttnn.matmul) works on ttsim v1.3.1 with size limitations (≤64x64)
- Larger matrices may fail due to Pack_L1_Acc limitations in the simulator
- Results match PyTorch within bfloat16 precision (max diff ~0.03)

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
- Simulator: ttsim 1.3.1, ttnn 0.65.0, PyTorch CPU
- Container: Docker with multi-stage builds

---

[1.1.0]: https://github.com/tenstorrent/tenstorrent_playground/releases/tag/v1.1.0
[1.0.0]: https://github.com/tenstorrent/tenstorrent_playground/releases/tag/v1.0.0
