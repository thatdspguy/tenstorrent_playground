"""API routes for the playground backend."""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..models.schemas import (
    ModelInfo,
    SimulationRequest,
    SimulationResult,
    SimulationJob,
    HealthResponse,
)
from ..services.model_registry import model_registry
from ..services.simulator import simulator_service
from .. import __version__

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health and simulator availability."""
    simulator_available = await simulator_service.check_simulator_available()
    return HealthResponse(
        status="healthy",
        version=__version__,
        simulator_available=simulator_available
    )


@router.get("/models", response_model=list[ModelInfo], tags=["Models"])
async def list_models():
    """List all available models for simulation."""
    return model_registry.list_all()


@router.get("/models/{model_id}", response_model=ModelInfo, tags=["Models"])
async def get_model(model_id: str):
    """Get details for a specific model."""
    model = model_registry.get(model_id)
    if not model:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_id}")
    return model


@router.post("/simulate", response_model=SimulationJob, tags=["Simulation"])
async def run_simulation(request: SimulationRequest):
    """
    Run a simulation with the specified model and parameters.
    
    The simulation runs on the ttsim simulator in WSL2.
    Returns a job with status and results when complete.
    """
    # Validate model exists
    if not model_registry.exists(request.model_id):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid model_id: {request.model_id}"
        )
    
    # Check simulator availability
    if not await simulator_service.check_simulator_available():
        raise HTTPException(
            status_code=503,
            detail="Simulator not available. Ensure WSL2 and ttsim are properly configured."
        )
    
    # Run simulation
    job = await simulator_service.run_simulation(request)
    return job


@router.get("/simulate/{job_id}", response_model=SimulationJob, tags=["Simulation"])
async def get_simulation_job(job_id: str):
    """Get the status and results of a simulation job."""
    job = simulator_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job


@router.get("/jobs", response_model=list[SimulationJob], tags=["Simulation"])
async def list_simulation_jobs(limit: int = 10):
    """List recent simulation jobs."""
    return simulator_service.list_jobs(limit=limit)
