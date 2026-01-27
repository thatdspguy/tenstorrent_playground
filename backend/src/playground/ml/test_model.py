"""Test the trained MNIST model accuracy."""

import gzip
import os
import struct
import urllib.request

import torch
import torch.nn.functional as F

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


def test_model():
    # Load weights and move to CPU
    weights = torch.load("weights/mnist_weights.pt", weights_only=True, map_location="cpu")

    # Load test data
    images, labels = load_mnist_test()

    # Test the model manually (simulating inference)
    correct = 0
    total = labels.size(0)
    batch_size = 1000

    for i in range(0, total, batch_size):
        x = images[i : i + batch_size]
        target = labels[i : i + batch_size]
        b = x.size(0)

        # Pad to 832
        x_padded = torch.zeros(b, 832)
        x_padded[:, :784] = x

        # Layer 1: blocked matmul
        h1 = torch.zeros(b, 64)
        for j, w_block in enumerate(weights["layer1_blocks"]):
            x_chunk = x_padded[:, j * 64 : (j + 1) * 64]
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
        out = out[:, :10]  # Only first 10 outputs

        pred = out.argmax(dim=1)
        correct += (pred == target).sum().item()

    print(f"Test Accuracy: {100.0 * correct / total:.2f}%")
    print(f"Correct: {correct}/{total}")

    # Test a few samples
    print("\nSample predictions:")
    x = images[:5]
    target = labels[:5]

    x_padded = torch.zeros(5, 832)
    x_padded[:, :784] = x

    h1 = torch.zeros(5, 64)
    for i, w_block in enumerate(weights["layer1_blocks"]):
        x_chunk = x_padded[:, i * 64 : (i + 1) * 64]
        h1 = h1 + x_chunk @ w_block
    h1 = h1 + weights["layer1_bias"]
    h1 = F.relu(h1)

    h2 = h1 @ weights["layer2_weight"] + weights["layer2_bias"]
    h2 = F.relu(h2)

    h3 = h2 @ weights["layer3_weight"] + weights["layer3_bias"]
    h3 = F.relu(h3)

    out = h3 @ weights["layer4_weight"] + weights["layer4_bias"]
    out = out[:, :10]

    probs = F.softmax(out, dim=1)
    preds = out.argmax(dim=1)

    for i in range(5):
        print(
            f"  Target: {target[i].item()}, Predicted: {preds[i].item()}, Confidence: {probs[i, preds[i]].item():.2%}"
        )


if __name__ == "__main__":
    test_model()
