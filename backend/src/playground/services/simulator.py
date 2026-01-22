"""Simulator service for running models on ttsim via WSL2."""

import asyncio
import json
import uuid
from datetime import datetime

from ..config import settings
from ..models.schemas import (
    HardwareComparison,
    PerformanceMetrics,
    SimulationJob,
    SimulationRequest,
    SimulationResult,
    SimulationStatus,
)
from .model_registry import get_estimated_speedup, model_registry

# Python script template to run in WSL2
SIMULATION_SCRIPT = """
import os
import sys
import warnings

# Suppress all logging before importing ttnn
os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"
warnings.filterwarnings("ignore")

import ttnn
import torch
import time
import json

# Configuration from arguments
config = json.loads(sys.argv[1])
model_id = config["model_id"]
batch_size = config["batch_size"]
iterations = config["iterations"]
matrix_size = config.get("matrix_size", 512)

# Debug output - print parameters received
print(f"[DEBUG] model_id={model_id}, matrix_size={matrix_size}, iterations={iterations}, batch_size={batch_size}", file=sys.stderr)

results = {
    "success": False,
    "error": None,
    "metrics": None,
    "output_sample": None
}

try:
    # Open device
    device = ttnn.open_device(device_id=0)
    
    if model_id == "add_benchmark":
        # Simple element-wise addition benchmark (known to work on simulator)
        size = int(matrix_size)
        print(f"[DEBUG] Running add_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 1.0
        B = torch.ones(size, size) * 2.0
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        C_tt = ttnn.add(A_tt, B_tt)
        _ = ttnn.to_torch(C_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            C_tt = ttnn.add(A_tt, B_tt)
            result = ttnn.to_torch(C_tt)
        end_time = time.perf_counter()
        
        # Verify: 1 + 2 = 3
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "subtract_benchmark":
        # Element-wise subtraction: A - B
        size = int(matrix_size)
        print(f"[DEBUG] Running subtract_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 5.0
        B = torch.ones(size, size) * 2.0
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        C_tt = ttnn.subtract(A_tt, B_tt)
        _ = ttnn.to_torch(C_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            C_tt = ttnn.subtract(A_tt, B_tt)
            result = ttnn.to_torch(C_tt)
        end_time = time.perf_counter()
        
        # Verify: 5 - 2 = 3
        output_sample = [result[0, 0].item(), result[0, 1].item()]
        
    elif model_id == "multiply_benchmark":
        # Element-wise multiplication: A * B
        size = int(matrix_size)
        print(f"[DEBUG] Running multiply_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 2.0
        B = torch.ones(size, size) * 3.0
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        C_tt = ttnn.multiply(A_tt, B_tt)
        _ = ttnn.to_torch(C_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            C_tt = ttnn.multiply(A_tt, B_tt)
            result = ttnn.to_torch(C_tt)
        end_time = time.perf_counter()
        
        # Verify: 2 * 3 = 6
        output_sample = [result[0, 0].item(), result[0, 1].item()]
        
    elif model_id == "exp_benchmark":
        # Exponential function: exp(x)
        size = int(matrix_size)
        print(f"[DEBUG] Running exp_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 1.0  # exp(1) is about 2.718
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.exp(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.exp(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: exp(1) is about 2.718
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "log_benchmark":
        # Natural logarithm: ln(x)
        size = int(matrix_size)
        print(f"[DEBUG] Running log_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 2.718281828  # ln(e) = 1
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.log(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.log(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: ln(e) is about 1.0
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "sqrt_benchmark":
        # Square root: sqrt(x)
        size = int(matrix_size)
        print(f"[DEBUG] Running sqrt_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 4.0  # sqrt(4) = 2
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.sqrt(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.sqrt(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: sqrt(4) = 2.0
        output_sample = [result[0, 0].item(), result[0, 1].item()]
        
    elif model_id == "relu_benchmark":
        # ReLU activation: max(0, x)
        size = int(matrix_size)
        print(f"[DEBUG] Running relu_benchmark with size={size}x{size}", file=sys.stderr)
        
        # Mix of positive and negative values
        A = torch.randn(size, size)
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.relu(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.relu(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Output will show non-negative values (negatives become 0)
        output_sample = [result[0, 0].item(), result[0, 1].item()]
        
    elif model_id == "chain_benchmark":
        # Operation chain: Add -> ReLU -> Multiply
        size = int(matrix_size)
        print(f"[DEBUG] Running chain_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.randn(size, size)  # Random values
        B = torch.ones(size, size) * 0.5  # Add 0.5
        C = torch.ones(size, size) * 2.0  # Multiply by 2
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        C_tt = ttnn.from_torch(C, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup: (A + B) -> ReLU -> * C
        step1 = ttnn.add(A_tt, B_tt)
        step2 = ttnn.relu(step1)
        step3 = ttnn.multiply(step2, C_tt)
        _ = ttnn.to_torch(step3)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            step1 = ttnn.add(A_tt, B_tt)
            step2 = ttnn.relu(step1)
            step3 = ttnn.multiply(step2, C_tt)
            result = ttnn.to_torch(step3)
        end_time = time.perf_counter()
        
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "sigmoid_benchmark":
        # Sigmoid activation: 1/(1+exp(-x))
        size = int(matrix_size)
        print(f"[DEBUG] Running sigmoid_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.zeros(size, size)  # sigmoid(0) = 0.5
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.sigmoid(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.sigmoid(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: sigmoid(0) = 0.5
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "gelu_benchmark":
        # GELU activation (used in transformers)
        size = int(matrix_size)
        print(f"[DEBUG] Running gelu_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 1.0  # gelu(1) is about 0.841
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.gelu(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.gelu(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: gelu(1) is about 0.841
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "tanh_benchmark":
        # Tanh activation
        size = int(matrix_size)
        print(f"[DEBUG] Running tanh_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.zeros(size, size)  # tanh(0) = 0
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.tanh(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.tanh(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: tanh(0) = 0
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "silu_benchmark":
        # SiLU (Swish) activation: x * sigmoid(x)
        size = int(matrix_size)
        print(f"[DEBUG] Running silu_benchmark with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 1.0  # silu(1) is about 0.731
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        B_tt = ttnn.silu(A_tt)
        _ = ttnn.to_torch(B_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            B_tt = ttnn.silu(A_tt)
            result = ttnn.to_torch(B_tt)
        end_time = time.perf_counter()
        
        # Verify: silu(1) is about 0.731
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "chain_gelu_mul":
        # GELU -> Multiply chain (transformer FFN pattern)
        size = int(matrix_size)
        print(f"[DEBUG] Running chain_gelu_mul with size={size}x{size}", file=sys.stderr)
        
        A = torch.ones(size, size) * 1.0
        B = torch.ones(size, size) * 2.0  # Scale factor
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup: GELU(A) * B
        step1 = ttnn.gelu(A_tt)
        step2 = ttnn.multiply(step1, B_tt)
        _ = ttnn.to_torch(step2)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            step1 = ttnn.gelu(A_tt)
            step2 = ttnn.multiply(step1, B_tt)
            result = ttnn.to_torch(step2)
        end_time = time.perf_counter()
        
        # Verify: gelu(1) * 2 is about 1.682
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    else:
        raise ValueError(f"Unknown model: {model_id}")
    
    # Calculate metrics
    total_time_ms = (end_time - start_time) * 1000
    latency_ms = total_time_ms / iterations
    throughput = (iterations * batch_size) / (total_time_ms / 1000)
    
    # Estimate memory (rough approximation)
    memory_mb = batch_size * 0.5 + 10  # Base + per-batch
    
    results["success"] = True
    results["metrics"] = {
        "latency_ms": round(latency_ms, 3),
        "throughput_inferences_per_sec": round(throughput, 2),
        "memory_usage_mb": round(memory_mb, 2),
        "total_time_ms": round(total_time_ms, 3),
        "iterations": iterations
    }
    results["output_sample"] = [round(x, 4) for x in output_sample]
    
    ttnn.close_device(device)

except Exception as e:
    results["success"] = False
    results["error"] = str(e)
    try:
        ttnn.close_device(device)
    except:
        pass

# Use markers to make JSON output easy to find
print("###RESULT_START###")
print(json.dumps(results))
print("###RESULT_END###")
"""


class SimulatorService:
    """Service for running simulations on ttsim via WSL2."""

    def __init__(self):
        self._jobs: dict[str, SimulationJob] = {}

    async def check_simulator_available(self) -> bool:
        """Check if the simulator is available in WSL2."""
        try:
            result = await asyncio.create_subprocess_exec(
                "wsl",
                "-d",
                settings.wsl_distro,
                "-e",
                "bash",
                "-c",
                f"test -f {settings.tt_metal_simulator} && echo 'OK'",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await result.communicate()
            return b"OK" in stdout
        except Exception:
            return False

    async def run_simulation(self, request: SimulationRequest) -> SimulationJob:
        """Run a simulation and return a job with results."""

        # Create job
        job_id = str(uuid.uuid4())[:8]
        job = SimulationJob(
            job_id=job_id, status=SimulationStatus.PENDING, request=request, created_at=datetime.utcnow()
        )
        self._jobs[job_id] = job

        # Get model info
        model = model_registry.get(request.model_id)
        if not model:
            job.status = SimulationStatus.FAILED
            job.error = f"Model not found: {request.model_id}"
            job.completed_at = datetime.utcnow()
            return job

        # Prepare configuration
        config = {
            "model_id": request.model_id,
            "batch_size": request.batch_size,
            "iterations": request.iterations,
        }

        # Add model-specific params - use passed values or fall back to defaults
        for param in model.parameters:
            # Check if value was passed in request.parameters
            if request.parameters and param.name in request.parameters:
                # Convert string values to appropriate types for select params
                value = request.parameters[param.name]
                if param.type == "select" and isinstance(value, str):
                    # Try to convert to int if it looks like a number
                    try:
                        value = int(value)
                    except ValueError:
                        pass
                config[param.name] = value
            else:
                config[param.name] = param.default

        # DEBUG: Log simulation parameters to console
        print(f"[DEBUG] Starting simulation for job {job_id}")
        print(f"[DEBUG] Model: {request.model_id}")
        print(f"[DEBUG] Request parameters: {request.parameters}")
        print(f"[DEBUG] Final config: {config}")

        # Update status
        job.status = SimulationStatus.RUNNING
        job.progress = 0.1

        try:
            # Run simulation in WSL2
            result = await self._run_in_wsl(config)

            if result.get("success"):
                metrics = PerformanceMetrics(**result["metrics"])

                # Get operation-specific estimated speedup
                # Note: These are ESTIMATES - actual values require silicon hardware measurements
                speedup = get_estimated_speedup(request.model_id)

                expected_silicon = PerformanceMetrics(
                    latency_ms=round(metrics.latency_ms / speedup, 4),
                    throughput_inferences_per_sec=round(metrics.throughput_inferences_per_sec * speedup, 2),
                    memory_usage_mb=metrics.memory_usage_mb,
                    total_time_ms=round(metrics.total_time_ms / speedup, 4),
                    iterations=metrics.iterations,
                )

                comparison = HardwareComparison(
                    simulated=metrics, expected_silicon=expected_silicon, speedup_factor=speedup
                )

                job.result = SimulationResult(
                    model_id=request.model_id,
                    model_name=model.name,
                    batch_size=request.batch_size,
                    chip=request.chip,
                    metrics=metrics,
                    comparison=comparison,
                    output_sample=result.get("output_sample"),
                )
                job.status = SimulationStatus.COMPLETED
            else:
                job.status = SimulationStatus.FAILED
                job.error = result.get("error", "Unknown error")

        except asyncio.TimeoutError:
            job.status = SimulationStatus.FAILED
            job.error = f"Simulation timed out after {settings.simulator_timeout} seconds"
        except Exception as e:
            job.status = SimulationStatus.FAILED
            job.error = str(e)

        job.completed_at = datetime.utcnow()
        job.progress = 1.0
        return job

    async def _run_in_wsl(self, config: dict) -> dict:
        """Execute the simulation script in WSL2."""
        import os
        import tempfile

        # Create temporary files for script and config
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(config, f)
            config_file = f.name

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            # Modify script to read config from file
            modified_script = SIMULATION_SCRIPT.replace(
                "config = json.loads(sys.argv[1])", "config = json.load(open(sys.argv[1]))"
            )
            f.write(modified_script)
            script_file = f.name

        try:
            # Convert Windows paths to WSL paths
            # C:\Users\... -> /mnt/c/Users/...
            def to_wsl_path(win_path: str) -> str:
                path = win_path.replace("\\", "/")
                if path[1] == ":":
                    drive = path[0].lower()
                    return f"/mnt/{drive}{path[2:]}"
                return path

            wsl_config_path = to_wsl_path(config_file)
            wsl_script_path = to_wsl_path(script_file)

            # Build the command
            full_command = f"""
export TT_METAL_HOME={settings.tt_metal_home}
export TT_METAL_SIMULATOR={settings.tt_metal_simulator}
export TT_METAL_SLOW_DISPATCH_MODE=1
export PATH=$HOME/.local/bin:$PATH
python3 "{wsl_script_path}" "{wsl_config_path}"
"""

            process = await asyncio.create_subprocess_exec(
                "wsl",
                "-d",
                settings.wsl_distro,
                "-e",
                "bash",
                "-c",
                full_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=settings.simulator_timeout)
            except asyncio.TimeoutError:
                process.kill()
                raise

            # Parse output - look for JSON between markers
            output = stdout.decode("utf-8")
            stderr_text = stderr.decode("utf-8")

            # Look for the result between markers
            start_marker = "###RESULT_START###"
            end_marker = "###RESULT_END###"

            if start_marker in output and end_marker in output:
                start_idx = output.index(start_marker) + len(start_marker)
                end_idx = output.index(end_marker)
                json_str = output[start_idx:end_idx].strip()
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    return {"success": False, "error": f"JSON parse error: {e}. JSON: {json_str[:200]}"}

            # Fallback: look for JSON in output (last line that looks like JSON)
            for line in reversed(output.strip().split("\n")):
                line = line.strip()
                if line.startswith("{") and line.endswith("}"):
                    try:
                        return json.loads(line)
                    except json.JSONDecodeError:
                        continue

            # If no JSON found, return error with more details
            return {
                "success": False,
                "error": f"Failed to parse simulation output. Stdout: {output[:300]}. Stderr: {stderr_text[:300]}",
            }
        finally:
            # Clean up temporary files
            try:
                os.unlink(config_file)
                os.unlink(script_file)
            except:
                pass

    def get_job(self, job_id: str) -> SimulationJob | None:
        """Get a job by ID."""
        return self._jobs.get(job_id)

    def list_jobs(self, limit: int = 10) -> list[SimulationJob]:
        """List recent jobs."""
        jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
        return jobs[:limit]


# Global service instance
simulator_service = SimulatorService()
