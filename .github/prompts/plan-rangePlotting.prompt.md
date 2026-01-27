# Range Plotting Feature Plan

## Feature Overview
Add a mode where users can plot simulation results over a range of matrix sizes and/or batch sizes, displaying 2D line plots or 3D surface plots depending on the configuration.

---

## Follow-up Questions

### 1. **Sweep Execution Strategy**
Currently, simulations appear to be individual jobs. For range plotting:
- **Option A:** Frontend orchestrates multiple single simulation calls sequentially/in parallel
- **Option B:** Add a new backend endpoint that accepts ranges and runs all iterations server-side, returning aggregated results

**My recommendation:** Option A for simplicity (no backend changes for MVP), but Option B would be more performant for larger sweeps. **Which do you prefer, or should I plan for both (A first, B as enhancement)?**

---

### 2. **Steps vs. Number of Points**
You mentioned being torn between step size vs. predetermined number of steps. Here's my analysis:

| Approach | Pros | Cons |
|----------|------|------|
| **Step size** | Intuitive for linear scales, predictable spacing | Awkward for logarithmic, may result in odd endpoint |
| **Number of points** | Works well for both linear/log, consistent UX | Less intuitive for "I want every power of 2" |
| **Hybrid** | Best of both: points for log, step for linear | Slight UX complexity |

**My recommendation:** **Number of points** with smart defaults (e.g., 5-10 points). Technical users understand "10 samples between 32 and 1024" more universally than step sizes that change meaning across scales. **Do you agree, or would you prefer the hybrid approach?**

---

### 3. **Option 1 vs Option 2 – My Analysis**

| Aspect | Option 1 (Separate Page) | Option 2 (Dynamic Widget) |
|--------|--------------------------|---------------------------|
| **Discoverability** | Requires navigation, feature may be missed | Always visible, gradual enhancement |
| **Context switching** | User must leave current workflow | Stays in familiar environment |
| **UI complexity** | Clean separation, but duplicated UI | Single UI, but potentially cluttered |
| **Implementation** | More code duplication | More elegant, less code |
| **Professional feel** | Can feel like "advanced mode" | Feels integrated and polished |

**My recommendation:** **Option 2 (Dynamic Widget)** – A small toggle or dropdown that transforms the single-value input into a range input feels more modern and keeps the user in flow. We can add a subtle visual indicator when in "sweep mode."

**Do you want me to plan for Option 2, or do you still want me to compare both in the detailed plan?**

---

### 4. **3D Plot Library**
Chart.js doesn't natively support 3D surfaces. For the 3D plot (latency vs matrix_size vs batch_size), options include:
- **Plotly.js** – Excellent 3D surface plots, well-documented, React wrapper available
- **Three.js** – More complex but highly customizable
- **Recharts** – No native 3D support
- **Fall back to heatmap** – 2D color grid (matrix_size × batch_size) with color intensity for latency

**My recommendation:** **Plotly.js** for 3D surfaces (or heatmap as simpler alternative). **Which do you prefer?**

---

### 5. **Simulation Time Consideration**
If a user sweeps 10 matrix sizes × 10 batch sizes = 100 simulations, this could take significant time. Should the plan include:
- **Progress visualization** (showing completed points on the chart as they finish)?
- **Cancelation capability**?
- **Parallel execution** (if backend supports)?

## Answers to Follow-up Questions

### 1. Sweep Execution Strategy
Option B: Add a new backend endpoint that accepts ranges and runs all iterations server-side, returning aggregated results.

### 2. Steps vs. Number of Points
Number of points with smart defaults (e.g., 5-10 points).

### 3. Option 1 vs Option 2
Option 2 (Dynamic Widget) – A small toggle or dropdown that transforms the single-value input into a range input.

### 4. 3D Plot Library
Plotly.js for 3D surfaces (or heatmap as simpler alternative).

### 5. Simulation Time Consideration
Include progress visualization (showing completed points on the chart as they finish) and cancelation capability. Also consider parallel execution if backend supports it.


---

## Current Architecture Summary

### Frontend Stack
- **React + TypeScript** with Vite
- **Tailwind CSS v4** for styling (dark theme with purple accents)
- **Chart.js + react-chartjs-2** for existing charts (Bar, Doughnut)
- No external UI component library (custom Tailwind components)

### Backend Stack
- **FastAPI** with Python
- Single simulation endpoint: `POST /api/simulate`
- Parameters passed via `parameters` dict in `SimulationRequest`

### Current Parameter Widgets
- `matrix_size`: Select dropdown (32, 64, 128, 256, 512, 1024)
- `batch_size`: Select dropdown (1, 2, 4, 8, 16, 32)
- `iterations`: Int with slider (1-100)

### Key Files to Modify
| File | Purpose |
|------|---------|
| `frontend/src/components/ParameterConfig.tsx` | Add range input mode |
| `frontend/src/components/ResultsChart.tsx` | Add Line/3D chart for series data |
| `frontend/src/api/types.ts` | Add sweep request/result types |
| `frontend/src/api/client.ts` | Add sweep orchestration logic |
| `backend/src/playground/models/schemas.py` | Add sweep schemas (if backend sweep) |
| `backend/src/playground/api/routes.py` | Add sweep endpoint (if backend sweep) |

---

## Refined Implementation Plan

Based on the decisions above, here is the detailed implementation plan.

---

## Phase 1: Backend Sweep Endpoint

### 1.1 New Pydantic Schemas (`backend/src/playground/models/schemas.py`)

```python
class ScaleType(str, Enum):
    LINEAR = "linear"
    LOGARITHMIC = "logarithmic"

class ParameterRange(BaseModel):
    """Defines a range of values for a parameter sweep."""
    start: int
    end: int
    num_points: int = Field(default=5, ge=2, le=20)
    scale: ScaleType = ScaleType.LINEAR

class SweepSimulationRequest(BaseModel):
    """Request for running a parameter sweep simulation."""
    model_id: str
    matrix_size: int | ParameterRange  # Single value or range
    batch_size: int | ParameterRange   # Single value or range
    chip: str = "wormhole"
    iterations: int = Field(default=50, ge=1, le=100)

class SweepDataPoint(BaseModel):
    """A single data point in the sweep results."""
    matrix_size: int
    batch_size: int
    latency_ms: float
    throughput_inferences_per_sec: float
    memory_usage_mb: float

class SweepSimulationResult(BaseModel):
    """Result of a parameter sweep simulation."""
    job_id: str
    model_id: str
    model_name: str
    chip: str
    sweep_type: str  # "1d_matrix", "1d_batch", "2d"
    matrix_sizes: list[int]
    batch_sizes: list[int]
    data_points: list[SweepDataPoint]
    total_points: int
    completed_points: int
    status: str  # "running", "completed", "cancelled", "failed"
    error: str | None = None
```

### 1.2 New API Endpoint (`backend/src/playground/api/routes.py`)

```python
@router.post("/api/sweep", response_model=SweepSimulationResult)
async def run_sweep_simulation(request: SweepSimulationRequest):
    """
    Run a parameter sweep simulation.
    
    - If both matrix_size and batch_size are single values: returns single point
    - If one is a range: returns 1D sweep (line plot data)
    - If both are ranges: returns 2D sweep (surface plot data)
    """
    pass

@router.get("/api/sweep/{job_id}")
async def get_sweep_status(job_id: str):
    """Get the current status and partial results of a sweep job."""
    pass

@router.post("/api/sweep/{job_id}/cancel")
async def cancel_sweep(job_id: str):
    """Cancel a running sweep job."""
    pass
```

### 1.3 Sweep Service (`backend/src/playground/services/sweep_service.py`)

New service to handle sweep logic:
- Generate parameter combinations (linear/logarithmic spacing)
- Execute simulations in parallel using `asyncio.gather` with semaphore for concurrency control
- Stream progress updates via WebSocket or polling
- Handle cancellation gracefully

```python
class SweepService:
    def __init__(self, simulator_service: SimulatorService):
        self.simulator = simulator_service
        self.active_jobs: dict[str, SweepJob] = {}
    
    def generate_values(self, range_config: ParameterRange) -> list[int]:
        """Generate values based on linear or logarithmic scale."""
        if range_config.scale == ScaleType.LINEAR:
            return np.linspace(range_config.start, range_config.end, 
                             range_config.num_points, dtype=int).tolist()
        else:  # logarithmic
            return np.geomspace(range_config.start, range_config.end,
                              range_config.num_points, dtype=int).tolist()
    
    async def run_sweep(self, request: SweepSimulationRequest) -> str:
        """Start a sweep job, return job_id."""
        pass
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job."""
        pass
```

---

## Phase 2: Frontend Dynamic Range Widget

### 2.1 New Component: `RangeParameterInput.tsx`

A sleek, toggle-able component that switches between single-value and range mode.

```
┌─────────────────────────────────────────────────────────────┐
│ Matrix Size                                    [Single ▼]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  32  │  64  │ 128  │ 256  │ 512  │ 1024 │              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

         ↓ Toggle to "Range" ↓

┌─────────────────────────────────────────────────────────────┐
│ Matrix Size                                    [Range  ▼]   │
│ ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐ │
│ │ Start: [32 ▼] │  │ End: [1024 ▼] │  │ Points: [5    ]   │ │
│ └───────────────┘  └───────────────┘  └───────────────────┘ │
│ Scale: ○ Linear  ● Logarithmic                              │
│ Preview: 32, 64, 128, 256, 512, 1024                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Compact dropdown toggle (Single/Range) in the header
- Start/End dropdowns use existing valid options
- Number input for points (2-20, default 5)
- Radio buttons for scale type
- Live preview of generated values
- Purple accent border when in range mode (visual indicator)

### 2.2 State Management Updates

```typescript
// New types in frontend/src/api/types.ts
interface ParameterRange {
  start: number;
  end: number;
  numPoints: number;
  scale: 'linear' | 'logarithmic';
}

interface SweepConfig {
  matrixSize: number | ParameterRange;
  batchSize: number | ParameterRange;
}

interface SweepDataPoint {
  matrixSize: number;
  batchSize: number;
  latencyMs: number;
  throughputInferencesPerSec: number;
  memoryUsageMb: number;
}

interface SweepResult {
  jobId: string;
  sweepType: '1d_matrix' | '1d_batch' | '2d';
  matrixSizes: number[];
  batchSizes: number[];
  dataPoints: SweepDataPoint[];
  totalPoints: number;
  completedPoints: number;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
}
```

### 2.3 Updated `ParameterConfig.tsx`

- Replace matrix_size and batch_size dropdowns with `RangeParameterInput`
- Add "Sweep Mode" indicator badge when any parameter is in range mode
- Update "Run Simulation" button text to "Run Sweep" when in sweep mode
- Show estimated time/point count before running

---

## Phase 3: Visualization Components

### 3.1 Install Plotly.js

```bash
npm install plotly.js-dist-min react-plotly.js
npm install -D @types/react-plotly.js
```

### 3.2 New Component: `SweepResultsChart.tsx`

Intelligent chart component that renders based on sweep type:

#### 1D Sweep (Line Chart)
When only matrix_size OR batch_size is a range:

```
┌─────────────────────────────────────────────────────────────┐
│  Latency vs Matrix Size (Batch Size: 8)                     │
│  ─────────────────────────────────────                      │
│  │                                           ●              │
│  │                                    ●                     │
│  │                             ●                            │
│ L│                      ●                                   │
│ a│               ●                                          │
│ t│        ●                                                 │
│  │  ●                                                       │
│  └──────────────────────────────────────────────────────    │
│     32    64   128   256   512   1024                       │
│                  Matrix Size                                │
│                                                             │
│  [Latency ▼]  [Throughput]                    [Export CSV]  │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:** Use Chart.js Line chart (already have the library)
- Add `LineElement`, `PointElement` to Chart.js registration
- Purple line with gradient fill
- Hover tooltips with exact values
- Toggle between latency and throughput views

#### 2D Sweep (3D Surface / Heatmap)
When both matrix_size AND batch_size are ranges:

```
┌─────────────────────────────────────────────────────────────┐
│  Latency Surface                              [3D] [Heatmap]│
│  ──────────────────────────────────────────────────────────│
│                                                             │
│         ╱╲                                                  │
│        ╱  ╲╱╲                                               │
│       ╱      ╲                                              │
│      ╱────────╲                                             │
│     ╱──────────╲                                            │
│    ╱────────────╲                                           │
│                                                             │
│  [Latency ▼]  [Throughput]                    [Export CSV]  │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:** Plotly.js Surface plot
- 3D rotatable surface with Plotly
- Color gradient (purple theme: light purple → dark purple)
- Alternative heatmap view toggle
- Camera controls for 3D rotation

### 3.3 Progress Visualization

During sweep execution:

```
┌─────────────────────────────────────────────────────────────┐
│  Running Sweep...                              [Cancel]     │
│  ══════════════════════════════════░░░░░░░░░░  67% (20/30) │
│                                                             │
│  Live Preview:                                              │
│  │        ●                                                 │
│  │     ●     ●                                              │
│  │  ●           ●                                           │
│  │                 ●                                        │
│  └──────────────────────────                                │
│     32   64  128  256  512  ...                             │
│                                                             │
│  Estimated time remaining: ~45 seconds                      │
└─────────────────────────────────────────────────────────────┘
```

- Progress bar with point count
- Live chart that updates as results come in
- Cancel button
- Time estimate based on completed points

---

## Phase 4: Integration & Polish

### 4.1 `ResultsChart.tsx` Updates

Modify to detect sweep vs single results and render appropriate component:

```typescript
function ResultsChart({ result, sweepResult }: Props) {
  if (sweepResult) {
    return <SweepResultsChart result={sweepResult} />;
  }
  return <SingleResultChart result={result} />;
}
```

### 4.2 API Client Updates (`frontend/src/api/client.ts`)

```typescript
export async function startSweep(config: SweepConfig): Promise<string> {
  // Returns job_id
}

export async function getSweepStatus(jobId: string): Promise<SweepResult> {
  // Poll for status and results
}

export async function cancelSweep(jobId: string): Promise<void> {
  // Cancel running sweep
}
```

### 4.3 Error Handling

- Partial failure handling (show completed points even if some fail)
- Retry logic for transient failures
- Clear error messages with suggested actions

### 4.4 Accessibility

- Keyboard navigation for range inputs
- Screen reader labels for chart data
- High contrast mode support

---

## File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `frontend/src/components/RangeParameterInput.tsx` | Dynamic single/range toggle widget |
| `frontend/src/components/SweepResultsChart.tsx` | Line/3D/Heatmap visualization |
| `frontend/src/components/SweepProgress.tsx` | Progress bar and live preview |
| `frontend/src/hooks/useSweep.ts` | Sweep state management hook |
| `backend/src/playground/services/sweep_service.py` | Sweep orchestration logic |

### Modified Files
| File | Changes |
|------|---------|
| `frontend/src/components/ParameterConfig.tsx` | Replace dropdowns with RangeParameterInput |
| `frontend/src/components/ResultsChart.tsx` | Add sweep result detection and routing |
| `frontend/src/api/types.ts` | Add sweep-related types |
| `frontend/src/api/client.ts` | Add sweep API functions |
| `frontend/package.json` | Add plotly.js dependencies |
| `backend/src/playground/models/schemas.py` | Add sweep schemas |
| `backend/src/playground/api/routes.py` | Add sweep endpoints |

---

## UI/UX Design Principles

1. **Progressive Disclosure**: Single mode is default; range mode is one click away
2. **Visual Consistency**: Use existing Tailwind theme (purple accents, gray backgrounds)
3. **Immediate Feedback**: Live preview of generated values, progress during execution
4. **Non-Destructive**: Sweep mode doesn't lose single-value settings
5. **Professional Aesthetic**: Clean borders, subtle shadows, smooth transitions

---

## Implementation Order

1. **Backend first**: Create sweep endpoint and schemas (testable via API)
2. **Types**: Add TypeScript types for sweep data
3. **RangeParameterInput**: Build and test the dynamic widget
4. **Line Chart**: Implement 1D sweep visualization
5. **Integration**: Connect widget → API → chart
6. **3D/Heatmap**: Add Plotly.js for 2D sweeps
7. **Progress**: Add live updates and cancellation
8. **Polish**: Error handling, accessibility, responsive design

---

## Estimated Effort

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Backend | 4-6 hours |
| Phase 2: Range Widget | 3-4 hours |
| Phase 3: Visualizations | 4-6 hours |
| Phase 4: Polish | 2-3 hours |
| **Total** | **13-19 hours** |

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sweep execution | Backend endpoint | Better performance, proper cancellation |
| Range specification | Number of points | Works for both linear/log scales |
| UI approach | Dynamic widget | Integrated experience, no context switch |
| 3D visualization | Plotly.js | Best-in-class 3D surfaces, React support |
| Progress | Live chart updates | Immediate feedback, professional feel |
- [ ] Progress/cancellation requirements
