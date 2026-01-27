"""Test ttsim inference matches PyTorch CPU inference."""

import os

# MUST set simulator environment before importing ttnn
os.environ["TT_METAL_SIMULATOR_EN"] = "1"
os.environ["TT_METAL_SIMULATOR_LIB"] = os.path.expanduser("~/ttsim/libttsim_wh.so")
os.environ["TT_METAL_DEVICE_TYPE"] = "WH_ARCH_YAML"
os.environ["TT_METAL_DEVICE_ARCH_NAME"] = "wormhole"
os.environ["WH_ARCH_YAML"] = os.path.expanduser("~/ttsim/wormhole_b0_80_arch.yaml")
os.environ["LOGURU_LEVEL"] = "ERROR"
os.environ["TT_METAL_LOGGER_LEVEL"] = "ERROR"

import warnings

warnings.filterwarnings("ignore")

import gzip
import struct
import urllib.request

import torch
import torch.nn.functional as F
import ttnn

MNIST_URLS = {
    "test_images": "https://ossci-datasets.s3.amazonaws.com/mnist/t10k-images-idx3-ubyte.gz",
    "test_labels": "https://ossci-datasets.s3.amazonaws.com/mnist/t10k-labels-idx1-ubyte.gz",
}


def download_mnist(data_dir="/tmp/mnist"):
    """Download MNIST test data."""
    os.makedirs(data_dir, exist_ok=True)

    for name, url in MNIST_URLS.items():
        filepath = os.path.join(data_dir, os.path.basename(url))
        if not os.path.exists(filepath):
            print(f"Downloading {name}...")
            urllib.request.urlretrieve(url, filepath)

    return data_dir


def load_mnist_test(data_dir="/tmp/mnist"):
    """Load MNIST test data."""
    download_mnist(data_dir)

    # Load images
    images_path = os.path.join(data_dir, "t10k-images-idx3-ubyte.gz")
    with gzip.open(images_path, "rb") as f:
        magic, num, rows, cols = struct.unpack(">IIII", f.read(16))
        images = torch.frombuffer(bytearray(f.read()), dtype=torch.uint8).reshape(num, rows * cols).float()
        images = images / 255.0  # Normalize to [0, 1]
        images = (images - 0.1307) / 0.3081  # MNIST normalization

    # Load labels
    labels_path = os.path.join(data_dir, "t10k-labels-idx1-ubyte.gz")
    with gzip.open(labels_path, "rb") as f:
        magic, num = struct.unpack(">II", f.read(8))
        labels = torch.frombuffer(bytearray(f.read()), dtype=torch.uint8).long()

    return images, labels


def pytorch_inference(x, weights):
    """Run inference using PyTorch (reference)."""
    # Pad to 832
    x_padded = torch.zeros(1, 832)
    x_padded[:, :784] = x

    # Layer 1: blocked matmul
    h1 = torch.zeros(1, 64)
    for i, w_block in enumerate(weights["layer1_blocks"]):
        x_chunk = x_padded[:, i * 64 : (i + 1) * 64]
        h1 = h1 + x_chunk @ w_block
    h1 = h1 + weights["layer1_bias"]
    h1 = F.relu(h1)

    # Layer 2
    h2 = h1 @ weights["layer2_weight"] + weights["layer2_bias"]
    h2 = F.relu(h2)

    # Layer 3
    h3 = h2 @ weights["layer3_weight"] + weights["layer3_bias"]
    h3 = F.relu(h3)

    # Layer 4
    out = h3 @ weights["layer4_weight"] + weights["layer4_bias"]
    out = out[:, :10]

    return out


def ttsim_inference(x, weights, device):
    """Run inference using ttsim (test)."""
    # Pad to 832
    x_padded = torch.zeros(1, 832)
    x_padded[:, :784] = x.cpu()

    # Layer 1: blocked matmul
    accumulator = torch.zeros(1, 64)

    for i, w_block in enumerate(weights["layer1_blocks"]):
        x_chunk = x_padded[:, i * 64 : (i + 1) * 64]

        x_tt = ttnn.from_torch(x_chunk, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
        w_tt = ttnn.from_torch(w_block, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)

        out_tt = ttnn.matmul(x_tt, w_tt)
        out = ttnn.to_torch(out_tt)

        accumulator = accumulator + out.float()

    # Add bias and ReLU (FIXED - was missing ReLU)
    bias1_tt = ttnn.from_torch(
        weights["layer1_bias"].unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device
    )
    acc_tt = ttnn.from_torch(accumulator, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    h1_tt = ttnn.add(acc_tt, bias1_tt)
    h1_tt = ttnn.relu(h1_tt)  # ReLU after Layer 1
    h1 = ttnn.to_torch(h1_tt).float()

    # Layer 2
    h1_tt = ttnn.from_torch(h1, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w2_tt = ttnn.from_torch(weights["layer2_weight"], dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    b2_tt = ttnn.from_torch(
        weights["layer2_bias"].unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device
    )

    h2_tt = ttnn.matmul(h1_tt, w2_tt)
    h2_tt = ttnn.add(h2_tt, b2_tt)
    h2_tt = ttnn.relu(h2_tt)
    h2 = ttnn.to_torch(h2_tt).float()

    # Layer 3
    h2_tt = ttnn.from_torch(h2, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w3_tt = ttnn.from_torch(weights["layer3_weight"], dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    b3_tt = ttnn.from_torch(
        weights["layer3_bias"].unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device
    )

    h3_tt = ttnn.matmul(h2_tt, w3_tt)
    h3_tt = ttnn.add(h3_tt, b3_tt)
    h3_tt = ttnn.relu(h3_tt)
    h3 = ttnn.to_torch(h3_tt).float()

    # Layer 4
    h3_tt = ttnn.from_torch(h3, dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    w4_tt = ttnn.from_torch(weights["layer4_weight"], dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device)
    b4_tt = ttnn.from_torch(
        weights["layer4_bias"].unsqueeze(0), dtype=ttnn.bfloat16, layout=ttnn.TILE_LAYOUT, device=device
    )

    out_tt = ttnn.matmul(h3_tt, w4_tt)
    out_tt = ttnn.add(out_tt, b4_tt)
    out = ttnn.to_torch(out_tt).float()
    out = out[:, :10]

    return out


def main():
    print("Loading weights...")
    weights = torch.load(
        "/mnt/d/git/tenstorrent_playground/backend/src/playground/ml/weights/mnist_weights.pt", weights_only=True
    )

    print("Loading test data...")
    images, labels = load_mnist_test()

    print("Initializing ttsim device...")
    # Environment already set at top of file

    device = ttnn.open_device(device_id=0)

    # Test on 100 samples
    n_samples = 100
    pytorch_correct = 0
    ttsim_correct = 0
    matches = 0

    print(f"\nTesting {n_samples} samples...")
    for i in range(n_samples):
        x = images[i : i + 1]
        target = labels[i].item()

        # PyTorch inference
        pytorch_out = pytorch_inference(x, weights)
        pytorch_pred = pytorch_out.argmax(dim=1).item()

        # ttsim inference
        ttsim_out = ttsim_inference(x, weights, device)
        ttsim_pred = ttsim_out.argmax(dim=1).item()

        if pytorch_pred == target:
            pytorch_correct += 1
        if ttsim_pred == target:
            ttsim_correct += 1
        if pytorch_pred == ttsim_pred:
            matches += 1

        if i < 10:
            print(f"  Sample {i}: target={target}, pytorch={pytorch_pred}, ttsim={ttsim_pred}")

    print(f"\nResults on {n_samples} samples:")
    print(f"  PyTorch accuracy: {100.0 * pytorch_correct / n_samples:.2f}%")
    print(f"  ttsim accuracy: {100.0 * ttsim_correct / n_samples:.2f}%")
    print(f"  Agreement rate: {100.0 * matches / n_samples:.2f}%")

    ttnn.close_device(device)


if __name__ == "__main__":
    main()
