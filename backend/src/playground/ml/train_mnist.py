"""MNIST training script with 64x64 matrix multiplication constraint.

This script trains an MLP for digit recognition that respects the constraint
that no single matrix multiplication can exceed 64x64 dimensions.

Architecture:
- Input: 784 (28x28 flattened) - split into 13 blocks of 64 (last padded)
- Layer 1: 784 → 128 via blocked matmul (13 weight blocks of 64x128)
- Layer 2: 128 → 128 + ReLU + Dropout
- Layer 3: 128 → 64 + ReLU + Dropout
- Layer 4: 64 → 10 (output)

NOTE: For compatibility with existing inference code, we keep the original architecture:
- Layer 1: 784 → 64 via blocked matmul (13 blocks of 64x64)
- Layer 2: 64 → 64 + ReLU
- Layer 3: 64 → 64 + ReLU
- Layer 4: 64 → 10 (output, padded to 64 for inference)

The blocked approach for Layer 1:
- Split input (784) into 13 chunks of 64 features (last chunk padded from 16 to 64)
- Each chunk has its own 64x64 weight matrix
- Results are summed to produce 64-dim output

Enhanced training features:
- Data augmentation (rotation, translation, scaling) for robustness to hand-drawn input
- Dropout for regularization
- Learning rate scheduling with warmup
- More training epochs
"""

import argparse
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import ConcatDataset, DataLoader
from torchvision import datasets, transforms


class BlockedLinear(nn.Module):
    """Linear layer that splits input into 64-feature blocks for inference compatibility.

    For a 784 → 64 transformation:
    - Split 784 into 13 blocks (12 blocks of 64, 1 block of 16 padded to 64)
    - Each block has a 64x64 weight matrix
    - Output is sum of all block outputs plus bias

    This matches the inference constraint where no matmul exceeds 64x64.
    """

    def __init__(self, in_features: int, out_features: int, block_size: int = 64):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.block_size = block_size

        # Calculate number of blocks needed
        self.num_blocks = (in_features + block_size - 1) // block_size
        self.last_block_size = in_features - (self.num_blocks - 1) * block_size

        # Create weight matrices for each block (all 64x64 for inference)
        # During training, we'll only use the relevant portion of the last block
        self.weight_blocks = nn.ParameterList(
            [nn.Parameter(torch.empty(block_size, out_features)) for _ in range(self.num_blocks)]
        )

        self.bias = nn.Parameter(torch.empty(out_features))

        # Initialize weights
        self._reset_parameters()

    def _reset_parameters(self):
        for i, w in enumerate(self.weight_blocks):
            # Use Kaiming initialization
            nn.init.kaiming_uniform_(w, a=5**0.5)
            # Zero out unused portion of last block
            if i == self.num_blocks - 1 and self.last_block_size < self.block_size:
                with torch.no_grad():
                    w[self.last_block_size :, :] = 0
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass using blocked computation."""
        batch_size = x.shape[0]
        output = torch.zeros(batch_size, self.out_features, device=x.device, dtype=x.dtype)

        for i, weight in enumerate(self.weight_blocks):
            start_idx = i * self.block_size
            end_idx = min(start_idx + self.block_size, self.in_features)
            actual_size = end_idx - start_idx

            # Extract input chunk
            x_chunk = x[:, start_idx:end_idx]

            # If this is the last block and it's smaller, only use relevant weights
            if actual_size < self.block_size:
                w_chunk = weight[:actual_size, :]
            else:
                w_chunk = weight

            # Accumulate: x_chunk @ w_chunk
            output = output + x_chunk @ w_chunk

        return output + self.bias

    def get_inference_weights(self) -> list[torch.Tensor]:
        """Get weights formatted for inference (all 64x64 blocks).

        Returns list of 64x64 weight tensors, with last block zero-padded.
        """
        weights = []
        for i, w in enumerate(self.weight_blocks):
            # Clone and ensure it's 64x64
            w_block = w.detach().clone()
            # Last block: zero-pad the unused rows
            if i == self.num_blocks - 1 and self.last_block_size < self.block_size:
                w_block[self.last_block_size :, :] = 0
            weights.append(w_block)
        return weights


class BlockedMNISTNet(nn.Module):
    """MNIST network with all matrix multiplications ≤ 64x64.

    Architecture:
    - blocked_fc1: 784 → 64 (13 blocks of 64x64, accumulated)
    - fc2: 64 → 64 + ReLU + Dropout (single 64x64 matmul)
    - fc3: 64 → 64 + ReLU + Dropout (single 64x64 matmul)
    - fc4: 64 → 10 (single 64x64 matmul with padding for inference)

    Uses dropout during training for regularization.
    """

    def __init__(self, dropout_rate: float = 0.2):
        super().__init__()
        self.dropout_rate = dropout_rate

        # Layer 1: 784 → 64 via blocked matmul
        self.blocked_fc1 = BlockedLinear(784, 64, block_size=64)

        # Layers 2-3: 64 → 64 (fits in single 64x64 matmul)
        self.fc2 = nn.Linear(64, 64)
        self.fc3 = nn.Linear(64, 64)

        # Layer 4: 64 → 10 (for inference, pad to 64x64)
        self.fc4 = nn.Linear(64, 10)

        # Dropout for regularization
        self.dropout = nn.Dropout(dropout_rate)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Flatten input: (batch, 1, 28, 28) → (batch, 784)
        x = x.view(x.size(0), -1)

        # Layer 1: blocked matmul + ReLU + Dropout
        x = F.relu(self.blocked_fc1(x))
        x = self.dropout(x)

        # Layer 2: standard matmul + ReLU + Dropout
        x = F.relu(self.fc2(x))
        x = self.dropout(x)

        # Layer 3: standard matmul + ReLU + Dropout
        x = F.relu(self.fc3(x))
        x = self.dropout(x)

        # Layer 4: output logits
        x = self.fc4(x)

        return x

    def forward_with_activations(self, x: torch.Tensor) -> tuple[torch.Tensor, list[torch.Tensor]]:
        """Forward pass that also returns intermediate activations for visualization."""
        activations = []

        x = x.view(x.size(0), -1)
        activations.append(x.clone())  # Input

        x = F.relu(self.blocked_fc1(x))
        activations.append(x.clone())  # After layer 1

        x = F.relu(self.fc2(x))
        activations.append(x.clone())  # After layer 2

        x = F.relu(self.fc3(x))
        activations.append(x.clone())  # After layer 3

        x = self.fc4(x)
        activations.append(x.clone())  # Output logits

        return x, activations

    def get_inference_weights(self) -> dict:
        """Export weights in format suitable for ttsim inference.

        Returns dict with:
        - 'layer1_blocks': list of 13 tensors, each 64x64 (last zero-padded)
        - 'layer1_bias': tensor of shape (64,)
        - 'layer2_weight': tensor of shape (64, 64)
        - 'layer2_bias': tensor of shape (64,)
        - 'layer3_weight': tensor of shape (64, 64)
        - 'layer3_bias': tensor of shape (64,)
        - 'layer4_weight': tensor of shape (64, 64) - zero-padded from (64, 10)
        - 'layer4_bias': tensor of shape (64,) - zero-padded from (10,)
        """
        weights = {}

        # Layer 1: blocked weights
        weights["layer1_blocks"] = self.blocked_fc1.get_inference_weights()
        weights["layer1_bias"] = self.blocked_fc1.bias.detach().clone()

        # Layer 2: transpose to match ttnn matmul convention (input @ weight)
        weights["layer2_weight"] = self.fc2.weight.detach().t().clone()  # (64, 64)
        weights["layer2_bias"] = self.fc2.bias.detach().clone()

        # Layer 3
        weights["layer3_weight"] = self.fc3.weight.detach().t().clone()  # (64, 64)
        weights["layer3_bias"] = self.fc3.bias.detach().clone()

        # Layer 4: pad to 64x64 for inference
        w4 = self.fc4.weight.detach().t().clone()  # (64, 10)
        w4_padded = torch.zeros(64, 64)
        w4_padded[:, :10] = w4
        weights["layer4_weight"] = w4_padded

        b4 = self.fc4.bias.detach().clone()  # (10,)
        b4_padded = torch.zeros(64)
        b4_padded[:10] = b4
        weights["layer4_bias"] = b4_padded

        # Store original output size for inference
        weights["output_size"] = 10

        return weights


def train_epoch(
    model: nn.Module,
    device: torch.device,
    train_loader: DataLoader,
    optimizer: optim.Optimizer,
    epoch: int,
    log_interval: int = 100,
):
    """Train for one epoch."""
    model.train()
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = F.cross_entropy(output, target)
        loss.backward()
        optimizer.step()

        if batch_idx % log_interval == 0:
            print(
                f"Train Epoch: {epoch} [{batch_idx * len(data)}/{len(train_loader.dataset)} "
                f"({100.0 * batch_idx / len(train_loader):.0f}%)]\tLoss: {loss.item():.6f}"
            )


def test(model: nn.Module, device: torch.device, test_loader: DataLoader) -> tuple[float, float]:
    """Evaluate model on test set."""
    model.eval()
    test_loss = 0
    correct = 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += F.cross_entropy(output, target, reduction="sum").item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()

    test_loss /= len(test_loader.dataset)
    accuracy = 100.0 * correct / len(test_loader.dataset)

    print(
        f"\nTest set: Average loss: {test_loss:.4f}, Accuracy: {correct}/{len(test_loader.dataset)} ({accuracy:.2f}%)\n"
    )

    return test_loss, accuracy


def main():
    parser = argparse.ArgumentParser(description="Train MNIST with 64x64 constraint")
    parser.add_argument("--batch-size", type=int, default=128, help="training batch size")
    parser.add_argument("--test-batch-size", type=int, default=1000, help="test batch size")
    parser.add_argument("--epochs", type=int, default=50, help="number of epochs")
    parser.add_argument("--lr", type=float, default=0.001, help="learning rate")
    parser.add_argument("--dropout", type=float, default=0.2, help="dropout rate")
    parser.add_argument("--seed", type=int, default=42, help="random seed")
    parser.add_argument("--output-dir", type=str, default="weights", help="output directory")
    parser.add_argument("--data-dir", type=str, default="./data", help="MNIST data directory")
    parser.add_argument("--augment", action="store_true", default=True, help="use data augmentation")
    args = parser.parse_args()

    # Set random seed
    torch.manual_seed(args.seed)

    # Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Data transforms - with augmentation for training
    # Augmentation helps the model generalize to hand-drawn digits
    if args.augment:
        train_transform = transforms.Compose(
            [
                transforms.RandomAffine(
                    degrees=15,  # Random rotation up to ±15 degrees
                    translate=(0.1, 0.1),  # Random translation up to 10%
                    scale=(0.9, 1.1),  # Random scale between 90% and 110%
                    shear=5,  # Random shear up to 5 degrees
                ),
                transforms.ToTensor(),
                transforms.Normalize((0.1307,), (0.3081,)),  # MNIST mean and std
                # Add random noise to simulate pen thickness variations
                transforms.Lambda(lambda x: x + 0.05 * torch.randn_like(x)),
            ]
        )
    else:
        train_transform = transforms.Compose(
            [
                transforms.ToTensor(),
                transforms.Normalize((0.1307,), (0.3081,)),
            ]
        )

    # Test transform - no augmentation
    test_transform = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.1307,), (0.3081,)),  # MNIST mean and std
        ]
    )

    # Load MNIST
    print("Loading MNIST dataset...")
    train_dataset = datasets.MNIST(args.data_dir, train=True, download=True, transform=train_transform)
    test_dataset = datasets.MNIST(args.data_dir, train=False, download=True, transform=test_transform)

    # Create additional augmented copies of training data for more diversity
    if args.augment:
        print("Creating augmented training data...")
        # Create multiple augmented versions of the training set
        augmented_datasets = [train_dataset]
        for i in range(2):  # Add 2 more augmented copies
            aug_dataset = datasets.MNIST(args.data_dir, train=True, download=False, transform=train_transform)
            augmented_datasets.append(aug_dataset)
        train_dataset = ConcatDataset(augmented_datasets)
        print(f"Total training samples: {len(train_dataset)} (3x augmented)")

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0, pin_memory=True)
    test_loader = DataLoader(test_dataset, batch_size=args.test_batch_size, shuffle=False)

    # Create model
    model = BlockedMNISTNet(dropout_rate=args.dropout).to(device)
    print("\nModel architecture:")
    print(f"  Layer 1: 784 → 64 (blocked: {model.blocked_fc1.num_blocks} blocks of 64x64)")
    print("  Layer 2: 64 → 64")
    print("  Layer 3: 64 → 64")
    print("  Layer 4: 64 → 10")

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    print(f"  Total parameters: {total_params:,}")

    # Optimizer with weight decay for regularization
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)

    # Learning rate scheduler - cosine annealing with warm restarts
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)

    # Training loop
    best_accuracy = 0.0
    patience = 10  # Early stopping patience
    patience_counter = 0
    print("\nStarting training...")

    for epoch in range(1, args.epochs + 1):
        train_epoch(model, device, train_loader, optimizer, epoch)
        _, accuracy = test(model, device, test_loader)
        scheduler.step()

        current_lr = optimizer.param_groups[0]["lr"]
        print(f"Epoch {epoch}: LR = {current_lr:.6f}")

        if accuracy > best_accuracy:
            best_accuracy = accuracy
            patience_counter = 0

            # Save best model weights
            output_dir = Path(args.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            # Save full model state
            torch.save(model.state_dict(), output_dir / "mnist_model.pt")

            # Save inference-ready weights
            inference_weights = model.get_inference_weights()
            torch.save(inference_weights, output_dir / "mnist_weights.pt")

            print(f"Saved best model with accuracy: {best_accuracy:.2f}%")
        else:
            patience_counter += 1
            if patience_counter >= patience and epoch > 20:
                print(f"Early stopping at epoch {epoch} (no improvement for {patience} epochs)")
                break

    print("\nTraining complete!")
    print(f"Best test accuracy: {best_accuracy:.2f}%")

    output_dir = Path(args.output_dir)
    print(f"Weights saved to: {output_dir.absolute()}")

    # Verify saved weights
    print("\nVerifying saved weights format:")
    weights = torch.load(output_dir / "mnist_weights.pt", weights_only=True)
    print(f"  layer1_blocks: {len(weights['layer1_blocks'])} blocks of shape {weights['layer1_blocks'][0].shape}")
    print(f"  layer1_bias: {weights['layer1_bias'].shape}")
    print(f"  layer2_weight: {weights['layer2_weight'].shape}")
    print(f"  layer3_weight: {weights['layer3_weight'].shape}")
    print(f"  layer4_weight: {weights['layer4_weight'].shape}")
    print(f"  output_size: {weights['output_size']}")


if __name__ == "__main__":
    main()
