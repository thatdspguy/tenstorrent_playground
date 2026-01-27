"""Digit recognition service for running MNIST inference on ttsim.

This service handles:
1. Image preprocessing (base64 decode, resize, normalize)
2. Running blocked MLP inference on ttsim
3. Returning predictions with confidence scores
"""

import asyncio
import base64
import io
import json
import logging
import platform
import time
from pathlib import Path

import numpy as np
from PIL import Image

from ..config import settings
from ..models.schemas import DigitRecognitionRequest, DigitRecognitionResult

# Setup logging
logger = logging.getLogger(__name__)

# Detect execution mode
IS_LINUX = platform.system() == "Linux"
USE_NATIVE_MODE = IS_LINUX

# Path to trained weights
WEIGHTS_PATH = Path(__file__).parent.parent / "ml" / "weights" / "mnist_weights.pt"

# MNIST inference script for ttsim
MNIST_INFERENCE_SCRIPT = """
import os
import sys
import warnings

# Suppress logging before importing ttnn
os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"
warnings.filterwarnings("ignore")

import ttnn
import torch
import time
import json

# Load configuration
config = json.loads(sys.argv[1])
image_data = config["image_data"]  # Flattened 784 values
weights_path = config["weights_path"]

results = {
    "success": False,
    "error": None,
    "predicted_digit": None,
    "confidence": None,
    "all_confidences": None,
    "latency_ms": None,
    "layer_activations": None
}

try:
    # Load weights (ensure CPU for ttnn compatibility)
    weights = torch.load(weights_path, weights_only=True, map_location=torch.device("cpu"))
    layer1_blocks = [w.cpu().contiguous() for w in weights["layer1_blocks"]]  # List of 13 [64, 64] tensors
    layer1_bias = weights["layer1_bias"].cpu().contiguous()      # [64]
    layer2_weight = weights["layer2_weight"].cpu().contiguous()  # [64, 64]
    layer2_bias = weights["layer2_bias"].cpu().contiguous()      # [64]
    layer3_weight = weights["layer3_weight"].cpu().contiguous()  # [64, 64]
    layer3_bias = weights["layer3_bias"].cpu().contiguous()      # [64]
    layer4_weight = weights["layer4_weight"].cpu().contiguous()  # [64, 64] (output is first 10)
    layer4_bias = weights["layer4_bias"].cpu().contiguous()      # [64] (output is first 10)
    
    # Prepare input tensor [1, 784]
    x = torch.tensor(image_data, dtype=torch.float32).unsqueeze(0)
    
    # Pad to 832 (13 * 64) for blocked processing
    x_padded = torch.zeros(1, 832)
    x_padded[:, :784] = x
    
    # Open device
    device = ttnn.open_device(device_id=0)
    
    layer_activations = []
    
    start_time = time.perf_counter()
    
    # ========================================
    # Layer 1: Blocked 784 -> 64
    # ========================================
    # Split input into 13 blocks of 64
    accumulator = torch.zeros(1, 64)
    
    for i, w_block in enumerate(layer1_blocks):
        # Get input chunk [1, 64]
        x_chunk = x_padded[:, i*64:(i+1)*64]
        
        # Convert to ttnn tensors
        x_tt = ttnn.from_torch(x_chunk, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        w_tt = ttnn.from_torch(w_block, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        
        # Matmul: [1, 64] @ [64, 64] = [1, 64]
        out_tt = ttnn.matmul(x_tt, w_tt)
        out = ttnn.to_torch(out_tt)
        
        # Accumulate
        accumulator = accumulator + out.float()
    
    # Add bias and ReLU (matching training)
    bias1_tt = ttnn.from_torch(layer1_bias.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    acc_tt = ttnn.from_torch(accumulator, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    h1_tt = ttnn.add(acc_tt, bias1_tt)
    h1_tt = ttnn.relu(h1_tt)  # ReLU after Layer 1
    h1 = ttnn.to_torch(h1_tt).float()
    
    layer_activations.append(h1.squeeze().tolist())
    
    # ========================================
    # Layer 2: 64 -> 64 + ReLU
    # ========================================
    h1_tt = ttnn.from_torch(h1, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w2_tt = ttnn.from_torch(layer2_weight, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    b2_tt = ttnn.from_torch(layer2_bias.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    
    h2_tt = ttnn.matmul(h1_tt, w2_tt)
    h2_tt = ttnn.add(h2_tt, b2_tt)
    h2_tt = ttnn.relu(h2_tt)
    h2 = ttnn.to_torch(h2_tt).float()
    
    layer_activations.append(h2.squeeze().tolist())
    
    # ========================================
    # Layer 3: 64 -> 64 + ReLU
    # ========================================
    h2_tt = ttnn.from_torch(h2, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w3_tt = ttnn.from_torch(layer3_weight, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    b3_tt = ttnn.from_torch(layer3_bias.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    
    h3_tt = ttnn.matmul(h2_tt, w3_tt)
    h3_tt = ttnn.add(h3_tt, b3_tt)
    h3_tt = ttnn.relu(h3_tt)
    h3 = ttnn.to_torch(h3_tt).float()
    
    layer_activations.append(h3.squeeze().tolist())
    
    # ========================================
    # Layer 4: 64 -> 10 (output)
    # ========================================
    h3_tt = ttnn.from_torch(h3, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w4_tt = ttnn.from_torch(layer4_weight, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    b4_tt = ttnn.from_torch(layer4_bias.unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    
    logits_tt = ttnn.matmul(h3_tt, w4_tt)
    logits_tt = ttnn.add(logits_tt, b4_tt)
    logits = ttnn.to_torch(logits_tt).float()
    
    end_time = time.perf_counter()
    
    # Extract only first 10 outputs (rest are padding)
    logits_10 = logits[:, :10]
    
    # Softmax for probabilities (done on CPU for simplicity)
    probs = torch.softmax(logits_10, dim=1)
    
    layer_activations.append(probs.squeeze().tolist())
    
    # Get prediction
    predicted_digit = torch.argmax(probs, dim=1).item()
    confidence = probs[0, predicted_digit].item()
    all_confidences = probs.squeeze().tolist()
    
    latency_ms = (end_time - start_time) * 1000
    
    ttnn.close_device(device)
    
    results["success"] = True
    results["predicted_digit"] = predicted_digit
    results["confidence"] = confidence
    results["all_confidences"] = all_confidences
    results["latency_ms"] = latency_ms
    results["layer_activations"] = layer_activations

except Exception as e:
    results["success"] = False
    results["error"] = str(e)
    import traceback
    results["traceback"] = traceback.format_exc()

# Output results
print("###RESULT_START###")
print(json.dumps(results))
print("###RESULT_END###")
"""


def preprocess_image(base64_image: str) -> list[float]:
    """Preprocess a base64 encoded image for MNIST inference.

    Steps:
    1. Decode base64 to image
    2. Convert to grayscale
    3. Resize to 28x28
    4. Invert colors if needed (MNIST expects white digit on black background)
    5. Normalize to [0, 1]
    6. Flatten to 784 values

    Args:
        base64_image: Base64 encoded image data (with or without data URI prefix)

    Returns:
        List of 784 normalized pixel values
    """
    # Remove data URI prefix if present
    if "," in base64_image:
        base64_image = base64_image.split(",")[1]

    # Decode base64
    image_data = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(image_data))

    # Convert to grayscale
    image = image.convert("L")

    # Resize to 28x28
    image = image.resize((28, 28), Image.Resampling.LANCZOS)

    # Convert to numpy array
    pixels = np.array(image, dtype=np.float32)

    # Check if we need to invert (MNIST expects white on black)
    # If the image is mostly white (background), invert it
    if np.mean(pixels) > 127:
        pixels = 255 - pixels

    # Normalize to [0, 1]
    pixels = pixels / 255.0

    # Apply MNIST normalization (mean=0.1307, std=0.3081)
    pixels = (pixels - 0.1307) / 0.3081

    # Flatten to 784 values
    return pixels.flatten().tolist()


async def run_digit_recognition(request: DigitRecognitionRequest) -> DigitRecognitionResult:
    """Run digit recognition inference on ttsim.

    Args:
        request: Contains base64 encoded image and chip selection

    Returns:
        DigitRecognitionResult with prediction and metrics
    """
    logger.info(f"Starting digit recognition for chip: {request.chip}")
    logger.info(f"Weights path: {WEIGHTS_PATH}, exists: {WEIGHTS_PATH.exists()}")

    # Preprocess image
    try:
        image_flat = preprocess_image(request.image_data)
        logger.info(f"Preprocessed image to {len(image_flat)} values")
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return DigitRecognitionResult(
            predicted_digit=-1,
            confidence=0.0,
            all_confidences=[0.0] * 10,
            latency_ms=0.0,
            success=False,
            error=f"Image preprocessing failed: {str(e)}",
        )

    # Prepare config for inference script
    config = {"image_data": image_flat, "weights_path": str(WEIGHTS_PATH), "chip": request.chip}

    if USE_NATIVE_MODE:
        # Native Linux/Docker execution
        logger.info("Running in native mode")
        return await _run_native_inference(config)
    else:
        # WSL2 execution
        logger.info("Running in WSL2 mode")
        return await _run_wsl_inference(config)


async def _run_wsl_inference(config: dict) -> DigitRecognitionResult:
    """Run inference via WSL2 subprocess."""
    logger.info("Starting WSL inference")

    # Convert weights path to WSL path
    weights_path = config["weights_path"]
    if weights_path[1] == ":":
        drive = weights_path[0].lower()
        wsl_path = f"/mnt/{drive}" + weights_path[2:].replace("\\", "/")
        config["weights_path"] = wsl_path

    logger.info(f"WSL weights path: {config['weights_path']}")

    # Get chip and simulator path
    chip = config.get("chip", "wormhole")
    simulator_path = settings.get_simulator_path(chip)
    soc_descriptor = settings.get_soc_descriptor(chip)

    logger.info(f"Chip: {chip}, Simulator: {simulator_path}, SOC: {soc_descriptor}")

    # Serialize config
    config_json = json.dumps(config)

    # Build WSL command with proper environment setup
    wsl_command = f"""
# Setup SOC descriptor
if [ "{chip}" = "blackhole" ]; then
    cp ~/ttsim/blackhole_soc_descriptor.yaml ~/ttsim/soc_descriptor.yaml 2>/dev/null || \\
    cp {settings.tt_metal_home}/tt_metal/soc_descriptors/{soc_descriptor} ~/ttsim/soc_descriptor.yaml
else
    cp {settings.tt_metal_home}/tt_metal/soc_descriptors/{soc_descriptor} ~/ttsim/soc_descriptor.yaml
fi

export TT_METAL_HOME={settings.tt_metal_home}
export TT_METAL_SIMULATOR={simulator_path}
export TT_METAL_SLOW_DISPATCH_MODE=1
export PATH=$HOME/.local/bin:$PATH
export LOGURU_LEVEL=ERROR
export TT_METAL_LOGGER_LEVEL=ERROR

python3 -c '
{MNIST_INFERENCE_SCRIPT}
' '{config_json}'
"""

    logger.info(f"WSL distro: {settings.wsl_distro}")

    start_time = time.time()

    try:
        # Run in WSL2
        result = await asyncio.create_subprocess_exec(
            "wsl",
            "-d",
            settings.wsl_distro,
            "-e",
            "bash",
            "-c",
            wsl_command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            result.communicate(),
            timeout=60.0,  # 60 second timeout
        )

        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")

        logger.info(f"WSL return code: {result.returncode}")
        logger.info(f"WSL stdout length: {len(stdout_text)}")
        logger.info(f"WSL stderr: {stderr_text[:500] if stderr_text else 'empty'}")

        # Parse results
        if "###RESULT_START###" in stdout_text and "###RESULT_END###" in stdout_text:
            result_json = stdout_text.split("###RESULT_START###")[1].split("###RESULT_END###")[0].strip()
            # Handle potential multiple JSON objects by taking only the first complete one
            try:
                result_data = json.loads(result_json)
            except json.JSONDecodeError as e:
                # Try to extract just the first JSON object
                logger.warning(f"JSON decode error, attempting to extract first object: {e}")
                import re

                # Find the first complete JSON object
                match = re.search(r'\{.*?"success":\s*(true|false).*?\}', result_json, re.DOTALL)
                if match:
                    result_data = json.loads(match.group(0))
                else:
                    raise
            logger.info(f"Inference result: success={result_data.get('success')}")

            if result_data["success"]:
                return DigitRecognitionResult(
                    predicted_digit=result_data["predicted_digit"],
                    confidence=result_data["confidence"],
                    all_confidences=result_data["all_confidences"],
                    latency_ms=result_data["latency_ms"],
                    layer_activations=result_data.get("layer_activations"),
                    success=True,
                )
            else:
                logger.error(f"Inference failed: {result_data.get('error')}")
                return DigitRecognitionResult(
                    predicted_digit=-1,
                    confidence=0.0,
                    all_confidences=[0.0] * 10,
                    latency_ms=0.0,
                    success=False,
                    error=result_data.get("error", "Unknown error"),
                )
        else:
            logger.error(f"Failed to parse WSL output. Stdout: {stdout_text[:500]}")
            return DigitRecognitionResult(
                predicted_digit=-1,
                confidence=0.0,
                all_confidences=[0.0] * 10,
                latency_ms=0.0,
                success=False,
                error=f"Failed to parse output. Stderr: {stderr_text[:500]}",
            )

    except asyncio.TimeoutError:
        logger.error("WSL inference timed out")
        return DigitRecognitionResult(
            predicted_digit=-1,
            confidence=0.0,
            all_confidences=[0.0] * 10,
            latency_ms=0.0,
            success=False,
            error="Inference timed out after 60 seconds",
        )
    except Exception as e:
        logger.exception(f"WSL inference exception: {e}")
        return DigitRecognitionResult(
            predicted_digit=-1, confidence=0.0, all_confidences=[0.0] * 10, latency_ms=0.0, success=False, error=str(e)
        )


async def _run_native_inference(config: dict) -> DigitRecognitionResult:
    """Run inference natively (Linux/Docker) - redirects to WSL."""
    # Even in native mode, use WSL for ttsim
    return await _run_wsl_inference(config)


def get_model_info() -> dict:
    """Get information about the MNIST model architecture."""
    return {
        "name": "Blocked MLP for MNIST",
        "input_size": 784,
        "output_size": 10,
        "architecture": [
            {"layer": 1, "type": "BlockedLinear", "in": 784, "out": 64, "blocks": 13, "block_size": 64},
            {"layer": 2, "type": "Linear+ReLU", "in": 64, "out": 64, "matmul_size": "64x64"},
            {"layer": 3, "type": "Linear+ReLU", "in": 64, "out": 64, "matmul_size": "64x64"},
            {"layer": 4, "type": "Linear", "in": 64, "out": 10, "matmul_size": "64x64 (padded)"},
        ],
        "constraint": "No matrix multiplication exceeds 64x64",
        "total_parameters": 13 * 64 * 64 + 64 + 64 * 64 + 64 + 64 * 64 + 64 + 64 * 64 + 64,
        "weights_file": str(WEIGHTS_PATH.name),
    }
