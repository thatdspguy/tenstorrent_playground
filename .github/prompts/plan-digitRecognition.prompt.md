# Digit Recognition Feature Implementation Plan

## Overview
Add a new **Digit Recognition Model** page to the Tenstorrent Simulator Playground that allows users to draw digits and run them through a trained MNIST model on ttsim.

---

## Decisions Summary

| Decision | Choice |
|----------|--------|
| **Image Size** | 28×28 standard MNIST (canvas 256×256, downsampled) |
| **Matrix Constraint** | No single matmul > 64×64 in any layer (use blocked matmul) |
| **Network Visualization** | All 3 modes with toggle: Static → Interactive → Live Activations |
| **Training** | Pre-trained weights bundled, trained offline |
| **Navigation** | Collapsible sidebar (expanded by default on desktop, hamburger toggle) |
| **Statistics** | Latency, Throughput, Memory, Confidence scores, Confusion matrix |

---

## Phase 1: Navigation Infrastructure ✅ COMPLETED

### 1.1 Install React Router ✅
```bash
cd frontend
npm install react-router-dom
```

### 1.2 Create Sidebar Navigation Component ✅
**File**: `frontend/src/components/Sidebar.tsx`
- Collapsible sidebar with hamburger toggle
- Default expanded on desktop
- Two nav items: "Mathematical Operations" and "Digit Recognition"
- Active state styling matching existing design system
- Smooth collapse/expand animation

### 1.3 Create Router Configuration ✅
**File**: `frontend/src/main.tsx`
- Wrap App with BrowserRouter

### 1.4 Restructure App.tsx ✅
**File**: `frontend/src/App.tsx`
- Add Sidebar component
- Set up React Router routes
- Create layout with sidebar + content area

### 1.5 Extract Current Page ✅
**File**: `frontend/src/pages/MathematicalOperationsPage.tsx`
- Move existing App.tsx content to this page component
- Added page header with chip selector
- Clean up imports

### 1.6 Create Placeholder Digit Recognition Page ✅
**File**: `frontend/src/pages/DigitRecognitionPage.tsx`
- Placeholder page with layout matching final design
- Shows drawing canvas placeholder, network visualization placeholder, stats placeholder
- Ready to be filled in Phase 4

### Files Created/Modified:
- [x] `frontend/src/main.tsx` - Added BrowserRouter
- [x] `frontend/src/components/Sidebar.tsx` - New sidebar nav component
- [x] `frontend/src/pages/MathematicalOperationsPage.tsx` - Extracted from App.tsx
- [x] `frontend/src/pages/DigitRecognitionPage.tsx` - New page shell with placeholder UI
- [x] `frontend/src/App.tsx` - Sidebar + route configuration

---

## Phase 2: MNIST Model Design (Constrained Architecture) ✅ COMPLETED

### 2.1 Architecture Design with 64×64 Constraint ✅

**Blocked Matrix Multiplication Strategy**:
```
Input: 784 features (28×28 flattened)
Layer 1: 784 → 64 (blocked: split 784 into 13 chunks of 64, accumulate results)
         - 13 matmuls of [batch, 64] × [64, 64], then sum
Layer 2: 64 → 64 (single matmul, fits constraint) + ReLU
Layer 3: 64 → 64 (single matmul, fits constraint) + ReLU  
Layer 4: 64 → 10 (single matmul with padding to 64×64) + Softmax
```

**Implementation Details**:
- Pad last chunk (16 features) to 64 with zeros
- Use `ttnn.add` to accumulate blocked results
- Store weights in 64×64 blocks for each layer

### 2.2 Supported Operations (Verified) ✅
- ✅ `ttnn.matmul` - Matrix multiplication (blocked)
- ✅ `ttnn.relu` - ReLU activation
- ✅ `ttnn.add` - Element-wise addition (for bias and accumulation)
- ✅ `ttnn.exp` - For softmax numerator
- ✅ `ttnn.softmax` - Softmax done on CPU after inference

### 2.3 Training Script ✅
**File**: `backend/src/playground/ml/train_mnist.py`
- Downloads MNIST dataset via torchvision
- Trains blocked MLP architecture matching inference constraints
- Saves weights as PyTorch tensors to `mnist_weights.pt`
- **Weights trained and saved** at `backend/src/playground/ml/weights/mnist_weights.pt`

### 2.4 Model Inference Service ✅
**File**: `backend/src/playground/services/digit_recognition.py`
- Loads pre-trained weights
- Preprocesses input: base64 decode, resize to 28x28, normalize, flatten to 784
- Executes blocked matmul inference on ttsim (or CPU fallback)
- Returns predictions with confidence scores and layer activations

---

## Phase 3: Backend API Endpoints ✅ COMPLETED

### 3.1 Pydantic Schemas ✅
**File**: `backend/src/playground/models/schemas.py`

Added:
- `DigitRecognitionRequest` - Base64 image + chip selection
- `DigitRecognitionResult` - Prediction, confidences, latency, activations
- `ModelArchitectureInfo` - Model architecture details

### 3.2 API Routes ✅
**File**: `backend/src/playground/api/routes.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/digit-recognition` | POST | Run digit inference |
| `/digit-recognition/model-info` | GET | Get model architecture info |

---

## Phase 4: Frontend - Digit Recognition Page ⬅️ CURRENT

### 4.1 Main Page Layout
**File**: `frontend/src/pages/DigitRecognitionPage.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ [Navigation: Math Ops | Digit Recognition]                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌────────────────────────────────────┐   │
│  │                 │  │                                    │   │
│  │   Drawing       │  │   Network Visualization            │   │
│  │   Canvas        │  │   (Interactive layers with         │   │
│  │   (256×256)     │  │    activations)                    │   │
│  │                 │  │                                    │   │
│  │  [Run] [Clear]  │  │                                    │   │
│  └─────────────────┘  └────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Prediction Results                                      │   │
│  │  ┌─────┐                                                │   │
│  │  │  7  │  Confidence: 98.5%                             │   │
│  │  └─────┘                                                │   │
│  │  [0: 0.1%] [1: 0.2%] [2: 0.1%] ... [7: 98.5%] ...      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Performance Statistics                                  │   │
│  │  Latency: 2.3ms | Throughput: 435 digits/sec            │   │
│  │  Model Accuracy: 97.2% | Memory: 0.5MB                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Drawing Canvas Component
**File**: `frontend/src/components/DigitCanvas.tsx`
- HTML5 Canvas with mouse/touch drawing
- White stroke on black background (MNIST format)
- Adjustable brush size
- Auto-resize to 28×28 or 8×8 for model input
- Export as base64 for API

### 4.3 Network Visualization Component
**File**: `frontend/src/components/NetworkVisualization.tsx`
- **Three visualization modes** (toggle button):
  1. **Static**: SVG-based layer diagram showing architecture
  2. **Interactive**: Clickable layers showing weight distributions
  3. **Live Activations**: Color-coded neuron activations during inference
- Show input → hidden → output flow
- Smooth transitions between modes

### 4.4 Prediction Display Component
**File**: `frontend/src/components/PredictionDisplay.tsx`
- Large predicted digit display
- Confidence bar chart for all 10 digits
- Animated transitions on new predictions

### 4.5 Statistics Panel Component
**File**: `frontend/src/components/ModelStatistics.tsx`
- Inference latency (per digit)
- Throughput (digits/second)
- Memory usage indicator
- Confusion matrix visualization (heatmap)
- Session prediction history

---

## Phase 5: API Client Updates

**File**: `frontend/src/api/client.ts`
```typescript
interface DigitRecognitionRequest {
  image_data: string;
  chip: string;
}

interface DigitRecognitionResult {
  predicted_digit: number;
  confidence: number;
  all_confidences: number[];
  latency_ms: number;
  throughput: number;
  layer_activations?: number[][];
}

// Add to apiClient:
async recognizeDigit(request: DigitRecognitionRequest): Promise<DigitRecognitionResult>
async getModelInfo(): Promise<ModelInfo>
async getModelStats(): Promise<ModelStats>
```

---

## Phase 6: Styling & Polish

### 6.1 Color Scheme (Match Existing)
```css
--tt-purple: #7c3aed
--tt-purple-light: #a78bfa
--tt-purple-dark: #5b21b6
--gray-900: #111827
--gray-800: #1f2937
--gray-700: #374151
```

### 6.2 Animation Enhancements
- Smooth transitions between pages
- Canvas stroke animation
- Prediction reveal animation
- Network activation flow animation

### 6.3 Responsive Design
- Maintain layout on different screen sizes
- Touch-friendly canvas for mobile

---

## File Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `frontend/src/components/Sidebar.tsx` | Collapsible sidebar navigation |
| `frontend/src/pages/MathematicalOperationsPage.tsx` | Extracted current page |
| `frontend/src/pages/DigitRecognitionPage.tsx` | New digit recognition page |
| `frontend/src/components/DigitCanvas.tsx` | Drawing canvas (256×256 → 28×28) |
| `frontend/src/components/NetworkVisualization.tsx` | Network diagram with 3 modes |
| `frontend/src/components/PredictionDisplay.tsx` | Prediction results |
| `frontend/src/components/ModelStatistics.tsx` | Performance stats + confusion matrix |
| `frontend/src/components/ConfusionMatrix.tsx` | Confusion matrix heatmap |
| `backend/src/playground/services/digit_recognition.py` | Inference service |
| `backend/src/playground/ml/train_mnist.py` | Training script |
| `backend/src/playground/ml/weights/mnist_weights.pt` | Trained weights |

### Files to Modify
| File | Changes |
|------|---------|
| `frontend/src/main.tsx` | Add BrowserRouter |
| `frontend/src/App.tsx` | Add routing configuration |
| `frontend/src/api/client.ts` | Add digit recognition methods |
| `frontend/src/api/types.ts` | Add new TypeScript interfaces |
| `backend/src/playground/api/routes.py` | Add digit recognition endpoints |
| `backend/src/playground/models/schemas.py` | Add request/response schemas |
| `backend/src/playground/services/model_registry.py` | Register MNIST model |

---

## Implementation Order

1. **Phase 1** - Navigation (Est: 2-3 hours)
2. **Phase 2** - Model Design & Training (Est: 3-4 hours)
3. **Phase 3** - Backend API (Est: 2 hours)
4. **Phase 4** - Frontend Components (Est: 4-5 hours)
5. **Phase 5** - API Client (Est: 1 hour)
6. **Phase 6** - Styling & Polish (Est: 2-3 hours)

**Total Estimated Time**: 14-18 hours

---

## Progress Tracking

- [ ] **Phase 1**: Navigation Infrastructure
- [ ] **Phase 2**: MNIST Model Design & Training
- [ ] **Phase 3**: Backend API Endpoints
- [ ] **Phase 4**: Frontend Components
- [ ] **Phase 5**: API Client Updates
- [ ] **Phase 6**: Styling & Polish
