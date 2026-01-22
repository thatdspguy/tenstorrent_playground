"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from enum import Enum
from typing import Union

from pydantic import BaseModel, Field


class SimulationStatus(str, Enum):
    """Status of a simulation job."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScaleType(str, Enum):
    """Scale type for parameter range generation."""

    LINEAR = "linear"
    LOGARITHMIC = "logarithmic"


class SweepStatus(str, Enum):
    """Status of a sweep job."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class ParameterRange(BaseModel):
    """Defines a range of values for a parameter sweep."""

    start: int = Field(ge=1, description="Start value of the range")
    end: int = Field(ge=1, description="End value of the range")
    num_points: int = Field(default=5, ge=2, le=20, description="Number of points to sample")
    scale: ScaleType = Field(default=ScaleType.LINEAR, description="Scale type for value generation")


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
    sweepable: bool = Field(default=False, description="Whether this parameter can be used in sweep mode")


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


# ============================================================================
# Sweep Simulation Schemas
# ============================================================================


class SweepParameter(BaseModel):
    """A parameter configuration for sweeping."""

    name: str = Field(description="Name of the parameter to sweep")
    values: Union[int, float, ParameterRange] = Field(description="Single value or range specification")


class SweepSimulationRequest(BaseModel):
    """Request for running a parameter sweep simulation.

    Supports up to 2 sweep parameters (x_axis and optional y_axis).
    All other parameters use fixed values from fixed_parameters.
    """

    model_id: str
    x_axis: SweepParameter = Field(description="Primary sweep parameter (X-axis)")
    y_axis: SweepParameter | None = Field(default=None, description="Secondary sweep parameter (Y-axis), optional")
    fixed_parameters: dict[str, int | float | str | bool] = Field(
        default_factory=dict, description="Fixed parameter values for non-swept parameters"
    )
    chip: str = Field(default="wormhole", pattern="^(wormhole|blackhole)$")
    iterations: int = Field(default=10, ge=1, le=100)


class SweepDataPoint(BaseModel):
    """A single data point in the sweep results."""

    parameter_values: dict[str, int | float] = Field(description="Parameter name to value mapping")
    latency_ms: float
    throughput_inferences_per_sec: float
    memory_usage_mb: float


class SweepSimulationResult(BaseModel):
    """Result of a parameter sweep simulation."""

    job_id: str
    model_id: str
    model_name: str
    chip: str
    sweep_type: str = Field(description="Type of sweep: '1d' or '2d'")
    x_axis_name: str = Field(description="Name of the X-axis parameter")
    x_axis_values: list[int | float] = Field(description="Values for X-axis parameter")
    y_axis_name: str | None = Field(default=None, description="Name of the Y-axis parameter (if 2D)")
    y_axis_values: list[int | float] | None = Field(default=None, description="Values for Y-axis parameter (if 2D)")
    data_points: list[SweepDataPoint] = Field(default_factory=list)
    total_points: int
    completed_points: int = 0
    status: SweepStatus = SweepStatus.PENDING
    error: str | None = None
    created_at: datetime | None = None
    completed_at: datetime | None = None
