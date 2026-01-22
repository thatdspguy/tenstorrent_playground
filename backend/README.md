# Tenstorrent Simulator Playground - Backend

FastAPI backend for running simulations on ttsim via WSL2.

## Overview

The backend provides a REST API that:
- Manages simulation jobs on the ttsim hardware simulator
- Runs TTNN operations via WSL2
- Returns performance metrics (latency, throughput, memory usage)
- Supports parameter sweep simulations for benchmarking

## Quick Start

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn playground.main:app --reload --host 127.0.0.1 --port 8000
```

## Project Structure

```
backend/
├── src/playground/
│   ├── __init__.py          # Package version
│   ├── config.py             # Settings and logging configuration
│   ├── main.py               # FastAPI application factory
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py         # API endpoint definitions
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py        # Pydantic request/response schemas
│   └── services/
│       ├── __init__.py
│       ├── model_registry.py # Available model definitions
│       ├── simulator.py      # WSL2/ttsim integration
│       └── sweep_service.py  # Parameter sweep service
├── pyproject.toml            # Project dependencies
└── README.md                 # This file
```

## API Endpoints

### Health & Status

| Endpoint           | Method | Description                                     |
| ------------------ | ------ | ----------------------------------------------- |
| `/api/health`      | GET    | Health check with simulator availability status |
| `/api/models`      | GET    | List all available models                       |
| `/api/models/{id}` | GET    | Get details for a specific model                |
| `/api/jobs`        | GET    | List recent simulation jobs                     |

### Simulations

| Endpoint                 | Method | Description                           |
| ------------------------ | ------ | ------------------------------------- |
| `/api/simulate`          | POST   | Start a new simulation                |
| `/api/simulate/{job_id}` | GET    | Get simulation job status and results |

### Parameter Sweeps

| Endpoint                     | Method | Description                        |
| ---------------------------- | ------ | ---------------------------------- |
| `/api/sweep`                 | POST   | Start a parameter sweep simulation |
| `/api/sweep/{job_id}`        | GET    | Get sweep status and results       |
| `/api/sweep/{job_id}/cancel` | POST   | Cancel a running sweep             |

## Configuration

Configuration is loaded from environment variables or a `.env` file.

### Environment Variables

| Variable             | Default                                              | Description                         |
| -------------------- | ---------------------------------------------------- | ----------------------------------- |
| `DEBUG`              | `false`                                              | Enable debug logging                |
| `HOST`               | `0.0.0.0`                                            | Server bind address                 |
| `PORT`               | `8000`                                               | Server port                         |
| `WSL_DISTRO`         | `Ubuntu`                                             | WSL2 distribution name              |
| `TT_METAL_HOME`      | `~/tt-metal`                                         | tt-metal installation path (in WSL) |
| `TT_METAL_SIMULATOR` | `~/ttsim/libttsim_wh.so`                             | Simulator library path (in WSL)     |
| `SIMULATOR_TIMEOUT`  | `300`                                                | Max simulation time in seconds      |
| `CORS_ORIGINS`       | `["http://localhost:5173", "http://localhost:3000"]` | Allowed CORS origins                |

### Example .env file

```bash
DEBUG=false
WSL_DISTRO=Ubuntu
TT_METAL_HOME=~/tt-metal
TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
CORS_ORIGINS=["http://localhost:5173"]
```

## API Examples

### Run a simulation

```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "add_benchmark",
    "iterations": 10,
    "parameters": {"matrix_size": 512}
  }'
```

### Start a parameter sweep

```bash
curl -X POST http://localhost:8000/api/sweep \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "add_benchmark",
    "iterations": 5,
    "x_axis": {
      "name": "matrix_size",
      "values": {"start": 32, "end": 512, "num_points": 5, "scale": "linear"}
    }
  }'
```

## Development

### Running Tests

```bash
uv run pytest
```

### Code Formatting

```bash
uv run ruff format .
uv run ruff check --fix .
```

## Requirements

- Python 3.12+
- Windows with WSL2 (Ubuntu recommended)
- ttsim and ttnn installed in WSL2 (see main README for setup)
