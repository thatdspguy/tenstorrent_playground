"""Convert weights to CPU format."""

import torch

# Load weights and ensure all on CPU
weights = torch.load("weights/mnist_weights.pt", weights_only=True, map_location="cpu")

# Ensure all tensors are CPU and contiguous
cpu_weights = {}
for key, val in weights.items():
    if isinstance(val, list):
        cpu_weights[key] = [t.cpu().contiguous() for t in val]
    elif isinstance(val, torch.Tensor):
        cpu_weights[key] = val.cpu().contiguous()
    else:
        cpu_weights[key] = val

# Save back
torch.save(cpu_weights, "weights/mnist_weights.pt")
print("Weights converted to CPU and saved")

# Verify
loaded = torch.load("weights/mnist_weights.pt", weights_only=True)
print(f"layer1_blocks[0] device: {loaded['layer1_blocks'][0].device}")
print(f"layer2_weight device: {loaded['layer2_weight'].device}")
