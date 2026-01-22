"""Model registry for available simulation models."""

from ..models.schemas import ModelInfo, ModelParameter


class ModelRegistry:
    """Registry of available models for simulation."""

    def __init__(self):
        self._models: dict[str, ModelInfo] = {}
        self._register_default_models()

    def _register_default_models(self):
        """Register the default set of models."""

        # MNIST MLP - Simple 3-layer network
        self.register(
            ModelInfo(
                id="mnist_mlp",
                name="MNIST MLP",
                description="Simple 3-layer Multi-Layer Perceptron for MNIST digit classification. "
                "Input: 28x28 grayscale images flattened to 784 features. "
                "Architecture: 784 → 128 → 64 → 10",
                architecture="MLP",
                input_shape=[1, 784],
                output_shape=[1, 10],
                estimated_params=109_386,  # 784*128 + 128 + 128*64 + 64 + 64*10 + 10
                parameters=[
                    ModelParameter(
                        name="batch_size",
                        display_name="Batch Size",
                        description="Number of images to process in parallel",
                        type="int",
                        default=1,
                        min=1,
                        max=128,
                    ),
                    ModelParameter(
                        name="hidden1_size",
                        display_name="Hidden Layer 1 Size",
                        description="Number of neurons in first hidden layer",
                        type="select",
                        default=128,
                        options=["64", "128", "256"],
                    ),
                    ModelParameter(
                        name="hidden2_size",
                        display_name="Hidden Layer 2 Size",
                        description="Number of neurons in second hidden layer",
                        type="select",
                        default=64,
                        options=["32", "64", "128"],
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # LeNet-5 style CNN (simplified for MVP)
        self.register(
            ModelInfo(
                id="lenet_cnn",
                name="LeNet CNN",
                description="LeNet-5 inspired Convolutional Neural Network for image classification. "
                "Classic architecture with 2 conv layers followed by fully connected layers.",
                architecture="CNN",
                input_shape=[1, 1, 28, 28],  # NCHW format
                output_shape=[1, 10],
                estimated_params=44_426,
                parameters=[
                    ModelParameter(
                        name="batch_size",
                        display_name="Batch Size",
                        description="Number of images to process in parallel",
                        type="int",
                        default=1,
                        min=1,
                        max=64,
                    ),
                    ModelParameter(
                        name="conv1_filters",
                        display_name="Conv1 Filters",
                        description="Number of filters in first conv layer",
                        type="select",
                        default=6,
                        options=["6", "8", "16"],
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # Simple matrix multiplication benchmark
        self.register(
            ModelInfo(
                id="matmul_benchmark",
                name="Matrix Multiplication",
                description="Simple matrix multiplication benchmark to measure raw compute performance. "
                "Useful for understanding baseline hardware capabilities.",
                architecture="Benchmark",
                input_shape=[512, 512],
                output_shape=[512, 512],
                estimated_params=0,  # No learnable params
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square matrices (NxN)",
                        type="select",
                        default=512,
                        options=["256", "512", "1024", "2048"],
                    ),
                    ModelParameter(
                        name="iterations",
                        display_name="Iterations",
                        description="Number of matrix multiplications to perform",
                        type="int",
                        default=10,
                        min=1,
                        max=100,
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # Add benchmark - simple and reliable for simulator testing
        self.register(
            ModelInfo(
                id="add_benchmark",
                name="Element-wise Addition",
                description="Simple element-wise addition benchmark. Performs A + B on tensors. "
                "Most reliable operation for simulator testing.",
                architecture="Benchmark",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square matrices (NxN)",
                        type="select",
                        default=32,
                        options=["32", "64", "128", "256"],
                    ),
                    ModelParameter(
                        name="iterations",
                        display_name="Iterations",
                        description="Number of additions to perform",
                        type="int",
                        default=10,
                        min=1,
                        max=100,
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

    def register(self, model: ModelInfo) -> None:
        """Register a model in the registry."""
        self._models[model.id] = model

    def get(self, model_id: str) -> ModelInfo | None:
        """Get a model by ID."""
        return self._models.get(model_id)

    def list_all(self) -> list[ModelInfo]:
        """List all registered models."""
        return list(self._models.values())

    def exists(self, model_id: str) -> bool:
        """Check if a model exists."""
        return model_id in self._models


# Global registry instance
model_registry = ModelRegistry()
