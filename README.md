# Tenstorrent Simulator Playground

A web-based playground demonstrating Tenstorrent developer tooling using a hardware-free simulator.

## Overview

This project provides:
- A **React-based frontend** for selecting models and viewing performance metrics
- A **FastAPI backend** for running simulations and returning results
- Integration with **tt-metal** for Tenstorrent simulator/mock capabilities

## Project Structure

```
tenstorrent_playground/
├── docs/                    # Documentation
├── external/
│   └── tt-metal/           # Tenstorrent SDK (git submodule)
├── backend/                 # Python/FastAPI backend
├── frontend/                # React/Vite frontend
└── scripts/                 # Development scripts
```

## Quick Start

### Prerequisites

- Windows with WSL2 (Ubuntu 22.04)
- Python 3.12+ (via uv)
- Node.js 18+
- Git

### Setup

1. Clone with submodules:
   ```bash
   git clone --recurse-submodules <repo-url>
   cd tenstorrent_playground
   ```

2. Backend setup:
   ```bash
   cd backend
   uv sync
   uv run uvicorn playground.main:app --reload
   ```

3. Frontend setup:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development

See [docs/tenstorrent_simulator_playground_guide_uv.md](docs/tenstorrent_simulator_playground_guide_uv.md) for the full implementation guide.

## License

MIT
