"""Sweep service for running parameter sweep simulations."""

import asyncio
import uuid
from datetime import datetime

import numpy as np

from ..models.schemas import (
    ScaleType,
    SimulationRequest,
    SweepDataPoint,
    SweepParameter,
    SweepSimulationRequest,
    SweepSimulationResult,
    SweepStatus,
)
from .model_registry import model_registry
from .simulator import simulator_service


class SweepJob:
    """Internal representation of a sweep job."""

    def __init__(
        self,
        job_id: str,
        request: SweepSimulationRequest,
        x_axis_name: str,
        x_axis_values: list[int | float],
        y_axis_name: str | None,
        y_axis_values: list[int | float] | None,
    ):
        self.job_id = job_id
        self.request = request
        self.x_axis_name = x_axis_name
        self.x_axis_values = x_axis_values
        self.y_axis_name = y_axis_name
        self.y_axis_values = y_axis_values or []
        self.data_points: list[SweepDataPoint] = []

        # Calculate total points
        x_count = len(x_axis_values)
        y_count = len(y_axis_values) if y_axis_values else 1
        self.total_points = x_count * y_count

        self.completed_points = 0
        self.status = SweepStatus.PENDING
        self.error: str | None = None
        self.created_at = datetime.utcnow()
        self.completed_at: datetime | None = None
        self.cancelled = False


class SweepService:
    """Service for managing parameter sweep simulations."""

    def __init__(self, max_concurrent: int = 4):
        self._jobs: dict[str, SweepJob] = {}
        self._max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)

    def generate_values(self, param: SweepParameter) -> list[int | float]:
        """Generate values from a parameter specification.

        Args:
            param: A SweepParameter with either a single value or a ParameterRange.

        Returns:
            List of values to sweep over.
        """
        if isinstance(param.values, (int, float)):
            return [param.values]

        range_spec = param.values
        if range_spec.scale == ScaleType.LINEAR:
            values = np.linspace(range_spec.start, range_spec.end, range_spec.num_points)
        else:  # LOGARITHMIC
            values = np.geomspace(range_spec.start, range_spec.end, range_spec.num_points)

        # Convert to integers and remove duplicates while preserving order
        int_values = []
        seen = set()
        for v in values:
            iv = int(round(v))
            if iv not in seen:
                seen.add(iv)
                int_values.append(iv)

        return int_values

    def determine_sweep_type(self, x_values: list, y_values: list | None) -> str:
        """Determine the type of sweep based on parameter dimensions."""
        if y_values and len(y_values) > 1:
            return "2d"
        else:
            return "1d"

    async def run_single_simulation(
        self,
        job: SweepJob,
        param_values: dict[str, int | float],
    ) -> SweepDataPoint | None:
        """Run a single simulation point within a sweep."""
        if job.cancelled:
            return None

        async with self._semaphore:
            if job.cancelled:
                return None

            # Build simulation parameters from fixed params + sweep params
            all_params = dict(job.request.fixed_parameters)
            all_params.update(param_values)

            # Extract batch_size if it's a sweep param, otherwise use from fixed
            batch_size = int(param_values.get("batch_size", all_params.get("batch_size", 1)))

            # Build simulation request
            request = SimulationRequest(
                model_id=job.request.model_id,
                batch_size=batch_size,
                chip=job.request.chip,
                iterations=job.request.iterations,
                parameters=all_params,
            )

            try:
                sim_job = await simulator_service.run_simulation(request)

                if sim_job.result and sim_job.result.metrics:
                    metrics = sim_job.result.metrics
                    return SweepDataPoint(
                        parameter_values=param_values,
                        latency_ms=metrics.latency_ms,
                        throughput_inferences_per_sec=metrics.throughput_inferences_per_sec,
                        memory_usage_mb=metrics.memory_usage_mb,
                    )
                else:
                    # Return a point with zero values on failure
                    return SweepDataPoint(
                        parameter_values=param_values,
                        latency_ms=0.0,
                        throughput_inferences_per_sec=0.0,
                        memory_usage_mb=0.0,
                    )
            except Exception as e:
                # Log error but continue sweep
                print(f"Sweep point failed: params={param_values}, error={e}")
                return SweepDataPoint(
                    parameter_values=param_values,
                    latency_ms=0.0,
                    throughput_inferences_per_sec=0.0,
                    memory_usage_mb=0.0,
                )

    async def run_sweep(self, request: SweepSimulationRequest) -> str:
        """Start a sweep simulation job.

        Args:
            request: The sweep simulation request.

        Returns:
            The job ID for tracking progress.
        """
        job_id = str(uuid.uuid4())

        # Generate parameter values for X-axis
        x_axis_values = self.generate_values(request.x_axis)
        x_axis_name = request.x_axis.name

        # Generate parameter values for Y-axis (if provided)
        y_axis_values = None
        y_axis_name = None
        if request.y_axis:
            y_axis_values = self.generate_values(request.y_axis)
            y_axis_name = request.y_axis.name

        # Create job
        job = SweepJob(
            job_id=job_id,
            request=request,
            x_axis_name=x_axis_name,
            x_axis_values=x_axis_values,
            y_axis_name=y_axis_name,
            y_axis_values=y_axis_values,
        )
        self._jobs[job_id] = job

        # Start sweep in background
        asyncio.create_task(self._execute_sweep(job))

        return job_id

    async def _execute_sweep(self, job: SweepJob) -> None:
        """Execute the sweep simulation."""
        job.status = SweepStatus.RUNNING

        try:
            # Generate all parameter combinations
            tasks = []

            if job.y_axis_name and job.y_axis_values:
                # 2D sweep
                for x_val in job.x_axis_values:
                    for y_val in job.y_axis_values:
                        param_values = {
                            job.x_axis_name: x_val,
                            job.y_axis_name: y_val,
                        }
                        tasks.append(self.run_single_simulation(job, param_values))
            else:
                # 1D sweep
                for x_val in job.x_axis_values:
                    param_values = {job.x_axis_name: x_val}
                    tasks.append(self.run_single_simulation(job, param_values))

            # Execute all tasks concurrently (semaphore limits actual concurrency)
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Collect successful results
            for result in results:
                if job.cancelled:
                    job.status = SweepStatus.CANCELLED
                    return

                if isinstance(result, SweepDataPoint):
                    job.data_points.append(result)
                    job.completed_points += 1
                elif isinstance(result, Exception):
                    print(f"Sweep task exception: {result}")
                    job.completed_points += 1

            job.status = SweepStatus.COMPLETED
            job.completed_at = datetime.utcnow()

        except Exception as e:
            job.status = SweepStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.utcnow()

    def get_job(self, job_id: str) -> SweepJob | None:
        """Get a sweep job by ID."""
        return self._jobs.get(job_id)

    def get_result(self, job_id: str) -> SweepSimulationResult | None:
        """Get the result of a sweep job."""
        job = self._jobs.get(job_id)
        if not job:
            return None

        model = model_registry.get(job.request.model_id)
        model_name = model.name if model else job.request.model_id

        return SweepSimulationResult(
            job_id=job.job_id,
            model_id=job.request.model_id,
            model_name=model_name,
            chip=job.request.chip,
            sweep_type=self.determine_sweep_type(job.x_axis_values, job.y_axis_values),
            x_axis_name=job.x_axis_name,
            x_axis_values=job.x_axis_values,
            y_axis_name=job.y_axis_name,
            y_axis_values=job.y_axis_values if job.y_axis_values else None,
            data_points=job.data_points,
            total_points=job.total_points,
            completed_points=job.completed_points,
            status=job.status,
            error=job.error,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a running sweep job."""
        job = self._jobs.get(job_id)
        if not job:
            return False

        if job.status == SweepStatus.RUNNING:
            job.cancelled = True
            job.status = SweepStatus.CANCELLED
            job.completed_at = datetime.utcnow()
            return True

        return False

    def list_jobs(self, limit: int = 10) -> list[SweepSimulationResult]:
        """List recent sweep jobs."""
        jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
        return [self.get_result(j.job_id) for j in jobs[:limit] if self.get_result(j.job_id)]


# Global service instance
sweep_service = SweepService()
