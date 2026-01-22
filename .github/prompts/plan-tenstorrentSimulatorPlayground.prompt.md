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

## Planned Step: tt-metal Repository Exploration

After adding the submodule, we should:

1. **Examine build system**: Review `CMakeLists.txt`, `build_metal.sh`, dependencies
2. **Study simulator/mock modes**: Find mock cluster descriptors, understand configuration
3. **Review model examples**: Look at `models/demos/` for inference patterns
4. **Explore TTNN tutorials**: Check `ttnn/tutorials/` for Jupyter notebooks
5. **Understand Python API**: Study `ttnn/` Python bindings
6. **Document findings**: Update plan with specific integration approach

---

## Next Steps (After Answers)

1. Initialize git repository
2. Configure .gitignore for Python, Node.js, and tt-metal build artifacts
3. Add tt-metal as submodule (pinned to appropriate version)
4. Explore tt-metal repository structure
5. Begin backend scaffolding
