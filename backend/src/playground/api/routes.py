"""API routes for the playground backend."""

from fastapi import APIRouter, HTTPException

from .. import __version__
from ..models.schemas import (
    HealthResponse,
    ModelInfo,
    SimulationJob,
    SimulationRequest,
    SweepSimulationRequest,
    SweepSimulationResult,
)
from ..services.model_registry import model_registry
from ..services.simulator import simulator_service
from ..services.sweep_service import sweep_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health and simulator availability."""
    simulator_available = await simulator_service.check_simulator_available()
    return HealthResponse(status="healthy", version=__version__, simulator_available=simulator_available)


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
        raise HTTPException(status_code=400, detail=f"Invalid model_id: {request.model_id}")

    # Check simulator availability
    if not await simulator_service.check_simulator_available():
        raise HTTPException(
            status_code=503, detail="Simulator not available. Ensure WSL2 and ttsim are properly configured."
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


# ============================================================================
# Sweep Simulation Endpoints
# ============================================================================


@router.post("/sweep", response_model=SweepSimulationResult, tags=["Sweep"])
async def run_sweep_simulation(request: SweepSimulationRequest):
    """
    Run a parameter sweep simulation.

    - If both matrix_size and batch_size are single values: returns single point
    - If one is a range: returns 1D sweep (line plot data)
    - If both are ranges: returns 2D sweep (surface plot data)

    The sweep runs simulations in parallel with progress tracking.
    """
    # Validate model exists
    if not model_registry.exists(request.model_id):
        raise HTTPException(status_code=400, detail=f"Invalid model_id: {request.model_id}")

    # Check simulator availability
    if not await simulator_service.check_simulator_available():
        raise HTTPException(
            status_code=503, detail="Simulator not available. Ensure WSL2 and ttsim are properly configured."
        )

    # Start sweep job
    job_id = await sweep_service.run_sweep(request)

    # Return initial result (will be updated as sweep progresses)
    result = sweep_service.get_result(job_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create sweep job")

    return result


@router.get("/sweep/{job_id}", response_model=SweepSimulationResult, tags=["Sweep"])
async def get_sweep_status(job_id: str):
    """Get the current status and results of a sweep job."""
    result = sweep_service.get_result(job_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Sweep job not found: {job_id}")
    return result


@router.post("/sweep/{job_id}/cancel", tags=["Sweep"])
async def cancel_sweep(job_id: str):
    """Cancel a running sweep job."""
    success = sweep_service.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Cannot cancel job: {job_id}")
    return {"status": "cancelled", "job_id": job_id}


@router.get("/sweeps", response_model=list[SweepSimulationResult], tags=["Sweep"])
async def list_sweep_jobs(limit: int = 10):
    """List recent sweep jobs."""
    return sweep_service.list_jobs(limit=limit)
