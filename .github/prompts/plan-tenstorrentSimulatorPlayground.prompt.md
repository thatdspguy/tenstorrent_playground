# Tenstorrent Simulator Playground - Implementation Plan

## Context

You are implementing a web-based playground that demonstrates Tenstorrent developer tooling using a hardware-free simulator. The project guide is at `tenstorrent_simulator_playground_guide_uv.md`. Phases 0-3 are complete. We are starting Phase 4.

---

## Clarifying Questions

### Repository & Project Structure

1. **Workspace location**: Do you want the git repository initialized at `d:\git\tenstorrent_playground` (your current folder), or do you want to create a new subfolder?

2. **tt-metal version pinning**: Should we pin the submodule to a specific release tag (e.g., `v2.x.x`) for stability, or track `main` for the latest features?

### Simulator Reality Check

3. **Simulator availability**: Based on research, tt-metal has:
   - `Simulator` mode requiring `TT_METAL_SIMULATOR` env var pointing to a simulator binary
   - `Mock` mode for testing without hardware
   
   The simulator binary doesn't appear bundled in the repo. Options:
   - Plan to use **Mock mode** for initial development?
   - Research simulator availability as a planned step?
   - Pivot to a **mock/synthetic performance metrics** approach for the demo?

### Backend Design

4. **API Mocking Strategy**: If the simulator has limitations, would you be okay with the backend returning **realistic mock performance data** based on documented benchmarks while we figure out full simulator integration?

5. **Python version**: The guide mentions 3.12, but tt-metal recommends 3.10+. Should we use **3.10** for maximum compatibility?

### Frontend Preferences

6. **UI Framework**: The guide mentions React + Vite + Tailwind. Do you have:
   - Any preference for a component library (shadcn/ui, Radix, MUI)?
   - Preference for charting (Recharts, Chart.js, or something else)?

### Development Workflow

7. **Monorepo structure**: Do you prefer:
   - **Option A**: `frontend/` and `backend/` folders at root, with `external/tt-metal/` submodule
   - **Option B**: Different structure?

8. **Conventional commits scope**: Would you like specific scopes defined (e.g., `feat(backend):`, `feat(frontend):`, `chore(deps):`)?

### MVP Definition

9. **Minimum models for MVP**: How many models should we target for the initial demo? The guide mentions LeNet, Tiny Transformer, and MLP. Should we start with **1 model** to get end-to-end working first?

10. **Performance metrics**: What specific metrics matter most?
    - Latency (ms)
    - Throughput (tokens/sec or inferences/sec)
    - Memory usage
    - All of the above?

## Answers to Clarifying Questions

### Repository & Project Structure

1. Initialize at `d:\git\tenstorrent_playground`.

2. Track `main` for latest features.

### Simulator Reality Check

3. Research simulator availability as a planned step. Fall back to Mock mode if needed.

### Backend Design

4. Yes, okay with realistic mock performance data initially. But it would be great to integrate the simulator as soon as possible.

5. Lets use Python 3.12 and we can revert if we hit compatibility issues.

### Frontend Preferences

6. I am open to suggestions for component library. For charting, let's use Chart.js.

### Development Workflow

7. Let's go with Option A.

8. Yes, please define specific scopes for conventional commits.

### MVP Definition

9. Start with 1 model for end-to-end working first.

10. All of the above metrics matter.

---

## Research Findings: tt-metal Repository

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `ttnn/` | High-level Python & C++ Neural Network OP library (PyTorch-like API) |
| `tt_metal/` | Low-level TT-Metalium programming model for kernel development |
| `models/` | Pre-built model implementations and demos (LLaMA, Whisper, Mixtral, etc.) |
| `models/demos/` | Ready-to-run model demonstrations |
| `tech_reports/` | Technical documentation on architecture, optimizations |
| `ttnn/tutorials/` | Jupyter notebook tutorials |

### Hardware-Free Modes

```cpp
enum class TargetDevice {
    Silicon = 0,    // Real hardware
    Simulator = 1,  // Simulation mode (requires external binary)
    Mock = 2,       // Mock device (no hardware)
};
```

**Mock Mode Configuration:**
```bash
export TT_METAL_MOCK_CLUSTER_DESC_PATH=/path/to/mock_cluster_desc.yaml
```

### Python API (TTNN)

```python
import ttnn

device = ttnn.open_device(device_id=0)
ttnn_tensor = ttnn.from_torch(torch_tensor, dtype=ttnn.bfloat16, 
                               layout=ttnn.TILE_LAYOUT, device=device)
result = ttnn.matmul(a, b)
torch_tensor = ttnn.to_torch(result)
ttnn.close_device(device)
```

---

## Proposed Project Structure

```
tenstorrent_playground/
├── .gitignore
├── .gitmodules
├── README.md
├── docs/
│   └── tenstorrent_simulator_playground_guide_uv.md
├── external/
│   └── tt-metal/                    # Git submodule
├── backend/
│   ├── pyproject.toml               # uv project
│   ├── src/
│   │   └── playground/
│   │       ├── __init__.py
│   │       ├── main.py              # FastAPI app
│   │       ├── api/
│   │       │   ├── __init__.py
│   │       │   └── routes.py
│   │       ├── models/
│   │       │   ├── __init__.py
│   │       │   └── schemas.py       # Pydantic models
│   │       ├── services/
│   │       │   ├── __init__.py
│   │       │   └── simulator.py     # Simulator integration
│   │       └── config.py
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── api/
└── scripts/
    └── setup.sh                     # Development setup script
```

---

## Proposed Commit Strategy (Conventional Commits)

### Scopes
- `repo` - Repository setup, git configuration
- `backend` - Python/FastAPI backend
- `frontend` - React/Vite frontend
- `deps` - Dependency changes
- `docs` - Documentation
- `ci` - CI/CD configuration

### Planned Commits (Phase 4+)

| Phase | Commit Message |
|-------|---------------|
| 4.1 | `chore(repo): initialize git repository with .gitignore` |
| 4.2 | `chore(deps): add tt-metal as git submodule` |
| 4.3 | `docs: move guide to docs folder and add README` |
| 5 | `feat(backend): scaffold FastAPI project with uv` |
| 5.1 | `feat(backend): add model selection API endpoint` |
| 5.2 | `feat(backend): implement simulator service abstraction` |
| 6 | `feat(frontend): scaffold React + Vite + Tailwind project` |
| 6.1 | `feat(frontend): add model selection UI component` |
| 6.2 | `feat(frontend): add performance metrics visualization` |
| 7 | `feat: integrate frontend with backend API` |
| 8 | `docs: add development and deployment instructions` |

---

## tt-metal Repository Exploration (COMPLETED)

### Key Findings

#### 1. Mock Mode Configuration
Mock mode uses cluster descriptor YAML files. Found at:
```
external/tt-metal/tests/tt_metal/tt_fabric/custom_mock_cluster_descriptors/
```
Example configurations:
- `n300_cluster_desc.yaml` - N300 (2x Wormhole)
- `t3k_cluster_desc.yaml` - TG/T3000 configuration
- `p100_cluster_desc.yaml` - Single chip

**Usage:**
```bash
export TT_METAL_MOCK_CLUSTER_DESC_PATH=path/to/cluster_desc.yaml
```

#### 2. Simulator Mode (ttsim) ✅ AVAILABLE!
The Tenstorrent simulator is publicly available at: https://github.com/tenstorrent/ttsim

**Latest Version:** v1.3.0 (released Jan 2026)

**Supported Chips:**
- Wormhole (`libttsim_wh.so`) - More mature
- Blackhole (`libttsim_bh.so`)

**Requirements:**
- Linux/x86_64 only (WSL2 works!)
- TT-Metalium installed and built
- Must use `TT_METAL_SLOW_DISPATCH_MODE=1`

**Installation:**
```bash
# In WSL2
mkdir -p ~/ttsim
cd ~/ttsim
wget https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_wh.so
wget https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_bh.so

# Copy SOC descriptor (required - must be in same directory as .so)
cp $TT_METAL_HOME/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml ~/ttsim/soc_descriptor.yaml

# Set environment variables
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1
```

**Known Limitations:**
- Fast dispatch not working (must use slow dispatch)
- Slower than real silicon but fast enough for development
- Bit-exact numerical results (matches hardware)

#### 3. Python API (TTNN)
Clean PyTorch-like API for model inference:
```python
import ttnn

device = ttnn.open_device(device_id=0)
tensor = ttnn.from_torch(torch_tensor, dtype=ttnn.bfloat16, 
                          layout=ttnn.TILE_LAYOUT, device=device)
result = ttnn.linear(tensor, weights, bias=bias)
output = ttnn.to_torch(result)
ttnn.close_device(device)
```

#### 4. Model Examples Available
| Model | Location | Complexity |
|-------|----------|------------|
| **MNIST MLP** | `models/demos/mnist/` | Simple (3-layer MLP) |
| **MobileNetV2** | `models/demos/mobilenetv2/` | Medium (CNN) |
| **BERT** | `models/demos/bert/` | Complex (Transformer) |
| **Whisper** | `models/demos/whisper/` | Complex (Speech) |

**MVP Model:** MNIST MLP (simple 3-layer architecture from `ttnn/tutorials/ttnn_mlp_inference_mnist.ipynb`)

#### 5. Performance Profiling
Built-in profiler available at `tt_metal/tools/profiler/`:
- Device profiling with Tracy integration
- Kernel-level performance counters
- NOC event profiling

#### 6. Hardware Requirements Reality Check
**IMPORTANT:** tt-metal requires actual Tenstorrent hardware or the simulator binary to run inference. Mock mode is for cluster topology testing, NOT for actual tensor computation.

### Integration Strategy

Given the simulator is now available, our updated approach:

1. **Phase 4.2 (NEW):** Set up WSL2 environment with tt-metal and ttsim
   - Install tt-metal from source or wheel
   - Download and configure ttsim
   - Verify simulator works with simple example
   
2. **Phase 5:** Build backend that interfaces with real simulator
   - Use subprocess to call Python scripts in WSL2
   - Or run entire backend in WSL2
   
3. **Phase 6:** Build frontend with real performance data

---

## Phase 4.2: WSL2 + tt-metal + ttsim Setup

### Prerequisites
Ensure WSL2 is installed with Ubuntu 22.04:
```powershell
wsl --install -d Ubuntu-22.04
```

### Step 1: Install System Dependencies (in WSL2)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    wget \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    clang-17 \
    libyaml-cpp-dev \
    libhwloc-dev \
    libgtest-dev \
    libgmock-dev \
    libboost-all-dev
```

### Step 2: Install uv (Python tooling)
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

### Step 3: Install tt-metal (Option A: From Wheel - Simpler)
```bash
# Create virtual environment
python3 -m venv ~/tt-env
source ~/tt-env/bin/activate

# Install ttnn
pip install ttnn

# Set TT_METAL_HOME (needed for SOC descriptors)
# Clone just for the descriptor files
git clone --depth 1 https://github.com/tenstorrent/tt-metal.git ~/tt-metal
export TT_METAL_HOME=~/tt-metal
```

### Step 3 (Alternative): Install tt-metal (Option B: From Source - Full)
```bash
cd ~
git clone https://github.com/tenstorrent/tt-metal.git --recurse-submodules
cd tt-metal
export TT_METAL_HOME=$(pwd)

# Install dependencies
./install_dependencies.sh

# Build
./build_metal.sh

# Create Python environment
./create_venv.sh
source python_env/bin/activate
```

### Step 4: Download and Configure ttsim
```bash
# Create simulator directory
mkdir -p ~/ttsim
cd ~/ttsim

# Download simulator binaries (v1.3.0)
wget https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_wh.so
wget https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_bh.so

# Copy SOC descriptor (REQUIRED - must be in same dir as .so)
cp $TT_METAL_HOME/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml ~/ttsim/soc_descriptor.yaml

# Set environment variables (add to ~/.bashrc for persistence)
echo 'export TT_METAL_HOME=~/tt-metal' >> ~/.bashrc
echo 'export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so' >> ~/.bashrc
echo 'export TT_METAL_SLOW_DISPATCH_MODE=1' >> ~/.bashrc
source ~/.bashrc
```

### Step 5: Verify Simulator Works
```bash
# Test with a simple Python script
python3 << 'EOF'
import ttnn
print("TTNN imported successfully!")
print(f"TTNN version: {ttnn.__version__ if hasattr(ttnn, '__version__') else 'N/A'}")

# Try to open device (this will use simulator)
try:
    device = ttnn.open_device(device_id=0)
    print(f"Device opened successfully: {device}")
    ttnn.close_device(device)
    print("Simulator is working!")
except Exception as e:
    print(f"Error: {e}")
EOF
```

---

## Implementation Phases (Updated)

### Phase 4.1 ✅ COMPLETED
- [x] Initialize git repository
- [x] Create .gitignore
- [x] Add tt-metal submodule
- [x] Create project structure
- [x] First commit: `chore(repo): initialize repository with project structure`

### Phase 4.2: WSL2 + Simulator Setup
- [ ] Install tt-metal dependencies in WSL2
- [ ] Install ttnn (via wheel or source)
- [ ] Download ttsim v1.3.0 binaries
- [ ] Configure SOC descriptor
- [ ] Verify simulator with test script
- [ ] Commit: `chore(deps): configure ttsim simulator in WSL2`

### Phase 5: Backend Development
- [ ] `feat(backend): scaffold FastAPI project with uv`
- [ ] `feat(backend): add model registry with MNIST MLP`
- [ ] `feat(backend): implement simulator service (real ttsim integration)`
- [ ] `feat(backend): add simulation API endpoints`
- [ ] `feat(backend): add performance metrics collection`

### Phase 6: Frontend Development  
- [ ] `feat(frontend): scaffold React + Vite + Tailwind project`
- [ ] `feat(frontend): add model selection component`
- [ ] `feat(frontend): add parameter configuration panel`
- [ ] `feat(frontend): add Chart.js performance visualization`
- [ ] `feat(frontend): implement API integration`

### Phase 7: Integration & Polish
- [ ] `feat: integrate frontend with backend`
- [ ] `feat: add loading states and error handling`
- [ ] `docs: add development and deployment instructions`
- [ ] `chore: add demo data and screenshots`

---

## API Design

### Endpoints

```
GET  /api/models                    # List available models
GET  /api/models/{id}               # Get model details
POST /api/simulate                  # Run simulation
GET  /api/simulate/{job_id}         # Get simulation results
GET  /api/benchmarks                # Get reference benchmarks
```

### Schemas

```python
# Request
class SimulationRequest(BaseModel):
    model_id: str
    batch_size: int = 1
    input_shape: list[int] | None = None
    
# Response
class SimulationResult(BaseModel):
    model_id: str
    batch_size: int
    metrics: PerformanceMetrics
    comparison: HardwareComparison

class PerformanceMetrics(BaseModel):
    latency_ms: float
    throughput_inferences_per_sec: float
    memory_usage_mb: float
    
class HardwareComparison(BaseModel):
    simulated: PerformanceMetrics
    expected_wormhole: PerformanceMetrics
    expected_blackhole: PerformanceMetrics | None
```

---

## Next Steps

1. **Scaffold backend** with FastAPI + uv
2. **Implement model registry** starting with MNIST MLP
3. **Create mock simulator service** with realistic metrics
4. **Scaffold frontend** with React + Vite + Tailwind + Chart.js
5. **Build UI components** for model selection and visualization
