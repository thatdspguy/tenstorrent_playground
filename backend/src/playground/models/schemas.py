"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SimulationStatus(str, Enum):
    """Status of a simulation job."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ModelParameter(BaseModel):
    """A configurable parameter for a model."""

    name: str
    display_name: str
    description: str
    type: str  # "int", "float", "select"
    default: int | float | str
    min: int | float | None = None
    max: int | float | None = None
    options: list[str] | None = None  # For select type


class ModelInfo(BaseModel):
    """Information about an available model."""

    id: str
    name: str
    description: str
    architecture: str
    input_shape: list[int]
    output_shape: list[int]
    parameters: list[ModelParameter]
    estimated_params: int  # Number of trainable parameters
    supported_chips: list[str] = ["wormhole", "blackhole"]


class SimulationRequest(BaseModel):
    """Request to run a simulation."""

    model_id: str
    batch_size: int = Field(default=1, ge=1, le=128)
    input_shape: list[int] | None = None
    chip: str = Field(default="wormhole", pattern="^(wormhole|blackhole)$")
    iterations: int = Field(default=10, ge=1, le=100)
    parameters: dict[str, int | float | str | bool] | None = Field(
        default=None, description="Model-specific parameters (e.g., matrix_size)"
    )


class PerformanceMetrics(BaseModel):
    """Performance metrics from a simulation."""

    latency_ms: float = Field(description="Average latency per inference in milliseconds")
    throughput_inferences_per_sec: float = Field(description="Inferences per second")
    memory_usage_mb: float = Field(description="Peak memory usage in megabytes")
    total_time_ms: float = Field(description="Total simulation time in milliseconds")
    iterations: int = Field(description="Number of iterations run")


class HardwareComparison(BaseModel):
    """Comparison between simulated and expected hardware performance."""

    simulated: PerformanceMetrics
    expected_silicon: PerformanceMetrics | None = None
    speedup_factor: float | None = Field(default=None, description="Expected speedup on real silicon vs simulation")


class SimulationResult(BaseModel):
    """Result of a completed simulation."""

    model_id: str
    model_name: str
    batch_size: int
    chip: str
    metrics: PerformanceMetrics
    comparison: HardwareComparison | None = None
    output_sample: list[float] | None = Field(default=None, description="Sample output values for verification")


class SimulationJob(BaseModel):
    """A simulation job with status tracking."""

    job_id: str
    status: SimulationStatus
    request: SimulationRequest
    result: SimulationResult | None = None
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    progress: float = Field(default=0.0, ge=0.0, le=1.0)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    simulator_available: bool
