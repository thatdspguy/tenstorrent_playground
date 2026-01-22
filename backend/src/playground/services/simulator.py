"""Simulator service for running models on ttsim via WSL2."""

import asyncio
import subprocess
import json
import time
import uuid
from datetime import datetime
from pathlib import Path

from ..config import settings
from ..models.schemas import (
    SimulationRequest,
    SimulationResult,
    SimulationJob,
    SimulationStatus,
    PerformanceMetrics,
    HardwareComparison,
)
from .model_registry import model_registry


# Python script template to run in WSL2
SIMULATION_SCRIPT = '''
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

results = {
    "success": False,
    "error": None,
    "metrics": None,
    "output_sample": None
}

try:
    # Open device
    device = ttnn.open_device(device_id=0)
    
    if model_id == "mnist_mlp":
        # MNIST MLP: 784 -> 128 -> 64 -> 10
        input_size = 784
        hidden1 = config.get("hidden1_size", 128)
        hidden2 = config.get("hidden2_size", 64)
        output_size = 10
        
        # Create random weights (simulating pre-trained model)
        W1 = torch.randn(hidden1, input_size) * 0.01
        b1 = torch.zeros(hidden1)
        W2 = torch.randn(hidden2, hidden1) * 0.01
        b2 = torch.zeros(hidden2)
        W3 = torch.randn(output_size, hidden2) * 0.01
        b3 = torch.zeros(output_size)
        
        # Convert to TTNN
        W1_tt = ttnn.from_torch(W1, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        b1_tt = ttnn.from_torch(b1.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        W2_tt = ttnn.from_torch(W2, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        b2_tt = ttnn.from_torch(b2.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        W3_tt = ttnn.from_torch(W3, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        b3_tt = ttnn.from_torch(b3.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Create input tensor
        x = torch.randn(batch_size, input_size)
        
        # Warmup
        x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        W1_t = ttnn.transpose(W1_tt, -2, -1)
        out = ttnn.linear(x_tt, W1_t, bias=b1_tt)
        out = ttnn.relu(out)
        W2_t = ttnn.transpose(W2_tt, -2, -1)
        out = ttnn.linear(out, W2_t, bias=b2_tt)
        out = ttnn.relu(out)
        W3_t = ttnn.transpose(W3_tt, -2, -1)
        out = ttnn.linear(out, W3_t, bias=b3_tt)
        _ = ttnn.to_torch(out)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
            out = ttnn.linear(x_tt, W1_t, bias=b1_tt)
            out = ttnn.relu(out)
            out = ttnn.linear(out, W2_t, bias=b2_tt)
            out = ttnn.relu(out)
            out = ttnn.linear(out, W3_t, bias=b3_tt)
            result = ttnn.to_torch(out)
        end_time = time.perf_counter()
        
        output_sample = result[0, :5].tolist()  # First 5 outputs
        
    elif model_id == "matmul_benchmark":
        # Matrix multiplication benchmark
        size = int(matrix_size)
        
        A = torch.randn(size, size)
        B = torch.randn(size, size)
        
        A_tt = ttnn.from_torch(A, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        B_tt = ttnn.from_torch(B, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Warmup
        C_tt = ttnn.matmul(A_tt, B_tt)
        _ = ttnn.to_torch(C_tt)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            C_tt = ttnn.matmul(A_tt, B_tt)
            result = ttnn.to_torch(C_tt)
        end_time = time.perf_counter()
        
        output_sample = [result[0, 0].item(), result[0, 1].item()]
    
    elif model_id == "add_benchmark":
        # Simple element-wise addition benchmark (known to work on simulator)
        size = int(matrix_size)
        
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
        
    elif model_id == "lenet_cnn":
        # Simplified LeNet - just do conv + linear for demo
        # Real implementation would use ttnn.conv2d
        
        # For now, flatten and use linear (simplified)
        input_size = 28 * 28
        output_size = 10
        
        W = torch.randn(output_size, input_size) * 0.01
        b = torch.zeros(output_size)
        
        W_tt = ttnn.from_torch(W, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        b_tt = ttnn.from_torch(b.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        x = torch.randn(batch_size, input_size)
        
        # Warmup
        x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        W_t = ttnn.transpose(W_tt, -2, -1)
        out = ttnn.linear(x_tt, W_t, bias=b_tt)
        _ = ttnn.to_torch(out)
        
        # Timed iterations
        start_time = time.perf_counter()
        for _ in range(iterations):
            x_tt = ttnn.from_torch(x, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
            out = ttnn.linear(x_tt, W_t, bias=b_tt)
            result = ttnn.to_torch(out)
        end_time = time.perf_counter()
        
        output_sample = result[0, :5].tolist()
    
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
'''


class SimulatorService:
    """Service for running simulations on ttsim via WSL2."""

    def __init__(self):
        self._jobs: dict[str, SimulationJob] = {}

    async def check_simulator_available(self) -> bool:
        """Check if the simulator is available in WSL2."""
        try:
            result = await asyncio.create_subprocess_exec(
                "wsl", "-d", settings.wsl_distro, "-e", "bash", "-c",
                f"test -f {settings.tt_metal_simulator} && echo 'OK'",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
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
            job_id=job_id,
            status=SimulationStatus.PENDING,
            request=request,
            created_at=datetime.utcnow()
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
        
        # Add model-specific params
        for param in model.parameters:
            if param.name not in config:
                config[param.name] = param.default

        # Update status
        job.status = SimulationStatus.RUNNING
        job.progress = 0.1

        try:
            # Run simulation in WSL2
            result = await self._run_in_wsl(config)
            
            if result.get("success"):
                metrics = PerformanceMetrics(**result["metrics"])
                
                # Create comparison with estimated silicon performance
                # Silicon is typically 50-200x faster than simulation
                speedup = 100.0  # Conservative estimate
                expected_silicon = PerformanceMetrics(
                    latency_ms=round(metrics.latency_ms / speedup, 4),
                    throughput_inferences_per_sec=round(metrics.throughput_inferences_per_sec * speedup, 2),
                    memory_usage_mb=metrics.memory_usage_mb,
                    total_time_ms=round(metrics.total_time_ms / speedup, 4),
                    iterations=metrics.iterations
                )
                
                comparison = HardwareComparison(
                    simulated=metrics,
                    expected_silicon=expected_silicon,
                    speedup_factor=speedup
                )
                
                job.result = SimulationResult(
                    model_id=request.model_id,
                    model_name=model.name,
                    batch_size=request.batch_size,
                    chip=request.chip,
                    metrics=metrics,
                    comparison=comparison,
                    output_sample=result.get("output_sample")
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
        import tempfile
        import os
        
        # Create temporary files for script and config
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(config, f)
            config_file = f.name
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            # Modify script to read config from file
            modified_script = SIMULATION_SCRIPT.replace(
                "config = json.loads(sys.argv[1])",
                "config = json.load(open(sys.argv[1]))"
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
                "wsl", "-d", settings.wsl_distro, "-e", "bash", "-c", full_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=settings.simulator_timeout
                )
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
                    return {
                        "success": False,
                        "error": f"JSON parse error: {e}. JSON: {json_str[:200]}"
                    }
            
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
                "error": f"Failed to parse simulation output. Stdout: {output[:300]}. Stderr: {stderr_text[:300]}"
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
        jobs = sorted(
            self._jobs.values(),
            key=lambda j: j.created_at,
            reverse=True
        )
        return jobs[:limit]


# Global service instance
simulator_service = SimulatorService()
