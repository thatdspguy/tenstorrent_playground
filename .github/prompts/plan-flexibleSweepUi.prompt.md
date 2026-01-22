# Plan: Flexible Parameter Sweep UI Reorganization

**TL;DR**: Reorganize the UI to fix button visibility by moving configuration into a compact horizontal top section, add a flexible "Sweep Axes" selector allowing any 1-2 parameters to be swept, and show both latency and throughput charts simultaneously.

---

## Problem Statement

1. **Run Simulation button is off-screen** - The current narrow left sidebar with scrollable content causes the button to be hidden on many viewport sizes
2. **Hardcoded sweep parameters** - Only `matrix_size` and `batch_size` are sweepable, defined in a hardcoded constant
3. **Single metric toggle** - Users must toggle between latency and throughput instead of seeing both
4. **Limited extensibility** - Adding new parameters requires changes in multiple places

---

## Implementation Steps

### Phase 1: UI Layout Reorganization

1. **Reorganize layout** to a horizontal top bar (model + sweep axes + run button) with full-width results below, eliminating the narrow scrollable sidebar that hides the button.

2. **Create `SweepAxisSelector` component** with dropdowns for X-axis and optional Y-axis parameter selection, each showing range configuration inline when selected.

3. **Add "Fixed Parameters" collapsible panel** below the axis selector for non-swept parameters (iterations, chip, etc.), keeping them accessible but out of the way.

### Phase 2: Backend Generalization

4. **Update backend `SweepSimulationRequest`** to accept generic parameter names instead of hardcoded `matrix_size`/`batch_size`, allowing any numeric parameter to be swept.

5. **Add `sweepable: boolean` field** to `ModelParameter` schema so the backend can declare which parameters support sweeping.

### Phase 3: Enhanced Visualization

6. **Show dual charts** (latency + throughput side-by-side) for completed sweeps, removing the toggle and displaying both metrics simultaneously.

7. **Add new sweepable parameters** to the model registry: `chip` (wormhole/blackhole), `data_type` (future), making the system extensible.

---

## Proposed UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🟣 Tenstorrent Simulator Playground                    ● Simulator Ready │
├─────────────────────────────────────────────────────────────────────────┤
│ Model: [Add Benchmark ▼]                                                │
├──────────────────────────────┬──────────────────────────────────────────┤
│ Sweep Configuration          │  Fixed Parameters  [▼ Expand]           │
│ ┌──────────────────────────┐ │  iterations: 10                         │
│ │ X-Axis: [matrix_size ▼]  │ │                                         │
│ │   32 → 1024, 5pts, log   │ │                                         │
│ ├──────────────────────────┤ │                                         │
│ │ Y-Axis: [batch_size ▼]   │ │     ┌─────────────────────┐             │
│ │   1 → 32, 5pts, log      │ │     │   [Run Sweep]       │             │
│ │ ☐ None (1D sweep)        │ │     └─────────────────────┘             │
│ └──────────────────────────┘ │                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────┐   ┌─────────────────────────────┐    │
│   │  Latency vs Parameters      │   │  Throughput vs Parameters   │    │
│   │  [3D Surface / Heatmap]     │   │  [3D Surface / Heatmap]     │    │
│   │                             │   │                             │    │
│   │         (chart)             │   │         (chart)             │    │
│   │                             │   │                             │    │
│   └─────────────────────────────┘   └─────────────────────────────┘    │
│                                                                         │
│   Min: 0.45ms  Max: 12.3ms  Points: 25        [Export CSV]             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `frontend/src/components/SweepAxisSelector.tsx` | Dropdown + inline range config for X/Y axis selection |
| `frontend/src/components/FixedParametersPanel.tsx` | Collapsible panel for non-swept parameters |
| `frontend/src/components/DualChartView.tsx` | Side-by-side latency + throughput charts |

### Modified Files
| File | Changes |
|------|---------|
| `frontend/src/App.tsx` | New horizontal layout, remove left sidebar |
| `frontend/src/api/types.ts` | Generic sweep parameter types |
| `backend/src/playground/models/schemas.py` | Generic sweep request with parameter names |
| `backend/src/playground/services/sweep_service.py` | Handle arbitrary parameter sweeps |
| `backend/src/playground/services/model_registry.py` | Add `sweepable` field to parameters |

---

## Further Considerations

1. **Parameter compatibility matrix?** Some parameter combinations may not make sense (e.g., sweeping `iterations` doesn't affect performance characteristics). Should we define which parameters are "sweepable" in the backend model definition?

2. **More than 2 sweep dimensions?** For 3+ dimensions, we'd need small multiples or sliders to select fixed values. Do you want to limit to 2 for now, or plan for extensibility?

3. **Memory usage parameter?** The current simulator returns `memory_usage_mb` - should this be a third chart, or is latency + throughput sufficient?

## Answers to Further Considerations

1. Yes, defining "sweepable" parameters in the backend model definition is a good approach to ensure only valid parameters are presented for sweeping.

2. Limiting to 2 sweep dimensions for now is sensible for simplicity. We can plan for extensibility in the future if needed.

3.  Adding memory usage as a third chart could be beneficial for users interested in resource consumption. We can consider this for a future enhancement after implementing the dual charts for latency and throughput. Make a plan to add it later based on user feedback.

---

## Estimated Effort

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: UI Layout | 4-6 hours |
| Phase 2: Backend Generalization | 2-3 hours |
| Phase 3: Enhanced Visualization | 2-3 hours |
| **Total** | **8-12 hours** |
