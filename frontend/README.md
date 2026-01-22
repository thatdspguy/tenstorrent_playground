# Tenstorrent Simulator Playground - Frontend

React-based web interface for the Tenstorrent Simulator Playground.

## Overview

The frontend provides an interactive UI for:
- Selecting and configuring simulation models
- Running single simulations or parameter sweeps
- Visualizing performance results with charts
- Comparing simulated vs expected silicon performance

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
frontend/
 public/                   # Static assets
 src/
    api/
       client.ts        # Axios API client configuration
       index.ts         # API exports
       types.ts         # TypeScript type definitions
    components/
       DualChartView.tsx       # Side-by-side chart comparison
       FixedParametersPanel.tsx # Fixed parameter configuration
       ModelSelector.tsx        # Model selection dropdown
       ParameterConfig.tsx      # Parameter input controls
       RangeParameterInput.tsx  # Range slider for sweeps
       ResultsChart.tsx         # Performance results chart
       SimulationStatus.tsx     # Job status indicator
       SweepAxisSelector.tsx    # Sweep axis configuration
       SweepProgress.tsx        # Sweep progress bar
       SweepResultsChart.tsx    # Sweep results visualization
    App.tsx              # Main application component
    index.css            # Global styles (Tailwind)
    main.tsx             # Application entry point
 index.html               # HTML template
 package.json             # Dependencies and scripts
 tsconfig.json            # TypeScript configuration
 vite.config.ts           # Vite bundler configuration
 README.md                # This file
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite 7** - Fast build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **Chart.js / Plotly.js** - Data visualization
- **Axios** - HTTP client

## Configuration

The API endpoint is configured in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    },
  },
}
```

For production builds, configure the API URL via environment variable:

```bash
VITE_API_URL=https://your-api-server.com npm run build
```

## Components

### ModelSelector
Dropdown for selecting which model/benchmark to run. Fetches available models from the API.

### ParameterConfig
Dynamic form that renders parameter inputs based on the selected model's configuration.

### ResultsChart
Bar chart showing latency, throughput, and memory metrics. Includes comparison between simulated and expected silicon performance.

### SweepResultsChart
Line chart for visualizing parameter sweep results across different input values.

### SweepProgress
Progress bar showing sweep completion status with point count.

## Styling

The UI uses Tenstorrent brand colors defined in Tailwind:
- Primary: Purple (#8B5CF6)
- Secondary: Gray (#374151)
- Background: Dark (#1F2937)

## Development

### Adding a New Component

1. Create component file in `src/components/`
2. Export from `src/components/index.ts`
3. Import in `App.tsx` or parent component

### Type Definitions

API types are defined in `src/api/types.ts` and should match the backend Pydantic schemas.

## Building for Production

```bash
npm run build
```

Output is in the `dist/` directory, ready to be served by any static file server.
