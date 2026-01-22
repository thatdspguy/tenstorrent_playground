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

#### 2. Simulator Mode
Requires external simulator binary (not bundled):
```bash
export TT_METAL_SIMULATOR=/path/to/simulator
```
**Status:** Simulator binary appears to be proprietary/internal. We'll use Mock mode for initial development.

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

Given the hardware requirements, our approach will be:

1. **Phase 1 (MVP):** Build UI and backend with **synthetic/mock performance data**
   - Realistic metrics based on documented benchmarks
   - API structure ready for real simulator integration
   
2. **Phase 2:** Research simulator binary availability
   - Contact Tenstorrent or check for public simulator releases
   - Docker images may include simulation capabilities
   
3. **Phase 3:** Integrate real simulator when available
   - Swap mock service for real TTNN calls

---

## Implementation Phases (Updated)

### Phase 4.1 ✅ COMPLETED
- [x] Initialize git repository
- [x] Create .gitignore
- [x] Add tt-metal submodule
- [x] Create project structure
- [x] First commit: `chore(repo): initialize repository with project structure`

### Phase 5: Backend Development
- [ ] `feat(backend): scaffold FastAPI project with uv`
- [ ] `feat(backend): add model registry with MNIST MLP`
- [ ] `feat(backend): implement mock simulator service`
- [ ] `feat(backend): add simulation API endpoints`
- [ ] `feat(backend): add realistic performance metrics generation`

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
