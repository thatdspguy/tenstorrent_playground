"""Model registry for available simulation models."""

from ..models.schemas import ModelInfo, ModelParameter


class ModelRegistry:
    """Registry of available models for simulation.

    Note: The ttsim simulator has limited operation support.
    Only element-wise operations (add, multiply, subtract, exp, relu, etc.) work reliably.
    Matrix multiplication and linear layers are NOT supported in ttsim v1.3.0.
    """

    def __init__(self):
        self._models: dict[str, ModelInfo] = {}
        self._register_default_models()

    def _register_default_models(self):
        """Register the default set of models.

        All models use element-wise operations that are supported by ttsim.
        """

        # Element-wise Addition benchmark
        self.register(
            ModelInfo(
                id="add_benchmark",
                name="Element-wise Addition",
                description="Performs A + B on tensors. Verifiable: 1.0 + 2.0 = 3.0. "
                "This is the most basic operation to verify simulator functionality.",
                architecture="Benchmark",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square tensors (NxN)",
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

        # Element-wise Multiplication benchmark
        self.register(
            ModelInfo(
                id="multiply_benchmark",
                name="Element-wise Multiply",
                description="Performs A * B on tensors. Verifiable: 2.0 * 3.0 = 6.0. "
                "Tests element-wise multiplication throughput.",
                architecture="Benchmark",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square tensors (NxN)",
                        type="select",
                        default=32,
                        options=["32", "64", "128", "256"],
                    ),
                    ModelParameter(
                        name="iterations",
                        display_name="Iterations",
                        description="Number of multiplications to perform",
                        type="int",
                        default=10,
                        min=1,
                        max=100,
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # Exponential benchmark
        self.register(
            ModelInfo(
                id="exp_benchmark",
                name="Exponential (exp)",
                description="Computes exp(x) element-wise. Common in softmax and attention. "
                "Tests transcendental function performance.",
                architecture="Benchmark",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square tensors (NxN)",
                        type="select",
                        default=32,
                        options=["32", "64", "128", "256"],
                    ),
                    ModelParameter(
                        name="iterations",
                        display_name="Iterations",
                        description="Number of exp operations to perform",
                        type="int",
                        default=10,
                        min=1,
                        max=100,
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # ReLU activation benchmark
        self.register(
            ModelInfo(
                id="relu_benchmark",
                name="ReLU Activation",
                description="Applies ReLU activation: max(0, x). Most common activation in neural networks. "
                "Tests conditional element-wise operation.",
                architecture="Benchmark",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square tensors (NxN)",
                        type="select",
                        default=32,
                        options=["32", "64", "128", "256"],
                    ),
                    ModelParameter(
                        name="iterations",
                        display_name="Iterations",
                        description="Number of ReLU operations to perform",
                        type="int",
                        default=10,
                        min=1,
                        max=100,
                    ),
                ],
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # Chained operations (simulating forward pass)
        self.register(
            ModelInfo(
                id="chain_benchmark",
                name="Op Chain (Add→ReLU→Mul)",
                description="Chains multiple operations: (A + B) → ReLU → multiply by scale. "
                "Simulates a simplified forward pass pattern.",
                architecture="Pipeline",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=[
                    ModelParameter(
                        name="matrix_size",
                        display_name="Matrix Size",
                        description="Size of square tensors (NxN)",
                        type="select",
                        default=32,
                        options=["32", "64", "128", "256"],
                    ),
                    ModelParameter(
                        name="iterations",
                        display_name="Iterations",
                        description="Number of chain operations to perform",
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
