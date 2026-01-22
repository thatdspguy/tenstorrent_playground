"""FastAPI application for Tenstorrent Simulator Playground."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .api.routes import router
from .config import settings


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.app_name,
        description="""
## Tenstorrent Simulator Playground API

A web-based playground for demonstrating Tenstorrent developer tooling using the **ttsim** hardware simulator.

### Features
- Run pre-defined models on the simulated Tenstorrent hardware
- View performance metrics (latency, throughput, memory)
- Compare simulated vs expected real-hardware performance

### Models Available
- **MNIST MLP**: Simple 3-layer neural network for digit classification
- **LeNet CNN**: Classic convolutional network architecture  
- **Matrix Multiplication**: Raw compute benchmark

### How It Works
1. Select a model from `/api/models`
2. Configure parameters (batch size, etc.)
3. Submit simulation to `/api/simulate`
4. View results with performance metrics
        """,
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(router, prefix="/api")

    @app.get("/", tags=["Root"])
    async def root():
        """Root endpoint with API information."""
        return {"name": settings.app_name, "version": __version__, "docs": "/docs", "api": "/api"}

    return app


# Create the app instance
app = create_app()
