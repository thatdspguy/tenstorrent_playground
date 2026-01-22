"""Model registry for available simulation models.

Models are organized into categories:
1. Basic Arithmetic: add, subtract, multiply
2. Mathematical Functions: exp, log, sqrt
3. Activation Functions: relu, sigmoid, tanh, gelu, silu
4. Pipelines: chained operations

Note: Speedup estimates are placeholder values - real measurements
would require actual silicon hardware.
"""

from ..models.schemas import ModelInfo, ModelParameter

# Estimated speedup factors for silicon vs simulator (placeholder values)
# These are rough estimates based on typical simulator vs silicon ratios.
# Actual values would need to be measured on real hardware.
ESTIMATED_SPEEDUPS = {
    # Basic arithmetic ops - fastest on silicon
    "add_benchmark": 50.0,
    "subtract_benchmark": 50.0,
    "multiply_benchmark": 55.0,
    # Transcendental functions - more compute intensive
    "exp_benchmark": 80.0,
    "log_benchmark": 75.0,
    "sqrt_benchmark": 60.0,
    # Activation functions - varies by complexity
    "relu_benchmark": 45.0,  # Simple comparison
    "sigmoid_benchmark": 90.0,  # Involves exp
    "tanh_benchmark": 85.0,  # Involves exp
    "gelu_benchmark": 100.0,  # Most complex
    "silu_benchmark": 95.0,  # Involves sigmoid
    # Pipelines - composite of individual ops
    "chain_add_relu_mul": 52.0,  # avg(add, relu, mul)
    "chain_gelu_mul": 78.0,  # weighted avg(gelu, mul)
    # Legacy name
    "chain_benchmark": 52.0,
}

# Default speedup for unknown models
DEFAULT_SPEEDUP = 50.0


def get_estimated_speedup(model_id: str) -> float:
    """Get the estimated speedup factor for a model."""
    return ESTIMATED_SPEEDUPS.get(model_id, DEFAULT_SPEEDUP)


def _make_standard_params(description_suffix: str = "operations") -> list[ModelParameter]:
    """Create standard matrix_size and iterations parameters."""
    return [
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
            description=f"Number of {description_suffix} to perform",
            type="int",
            default=10,
            min=1,
            max=100,
        ),
    ]


class ModelRegistry:
    """Registry of available models for simulation.

    Note: The ttsim simulator has limited operation support.
    Only element-wise operations work reliably.
    Matrix multiplication and linear layers are NOT supported in ttsim v1.3.0.
    """

    def __init__(self):
        self._models: dict[str, ModelInfo] = {}
        self._register_default_models()

    def _register_default_models(self):
        """Register the default set of models organized by category."""

        # ==================== BASIC ARITHMETIC ====================

        self.register(
            ModelInfo(
                id="add_benchmark",
                name="Add (A + B)",
                description="Element-wise addition. Verifiable: 1.0 + 2.0 = 3.0. The most basic tensor operation.",
                architecture="Arithmetic",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("additions"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="subtract_benchmark",
                name="Subtract (A - B)",
                description="Element-wise subtraction. Verifiable: 5.0 - 2.0 = 3.0. Basic arithmetic operation.",
                architecture="Arithmetic",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("subtractions"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="multiply_benchmark",
                name="Multiply (A * B)",
                description="Element-wise multiplication. Verifiable: 2.0 * 3.0 = 6.0. Note: This is NOT matrix multiplication.",
                architecture="Arithmetic",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("multiplications"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # ==================== MATHEMATICAL FUNCTIONS ====================

        self.register(
            ModelInfo(
                id="exp_benchmark",
                name="Exponential (exp)",
                description="Computes e^x element-wise. Verifiable: exp(1) ~ 2.718. Used in softmax, attention mechanisms.",
                architecture="Math",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("exp operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="log_benchmark",
                name="Natural Log (ln)",
                description="Computes ln(x) element-wise. Verifiable: ln(2.718) ~ 1.0. Used in cross-entropy loss calculations.",
                architecture="Math",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("log operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="sqrt_benchmark",
                name="Square Root",
                description="Computes sqrt(x) element-wise. Verifiable: sqrt(4) = 2.0. Used in normalization layers.",
                architecture="Math",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("sqrt operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # ==================== ACTIVATION FUNCTIONS ====================

        self.register(
            ModelInfo(
                id="relu_benchmark",
                name="ReLU",
                description="Rectified Linear Unit: max(0, x). The most common activation in neural networks.",
                architecture="Activation",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("ReLU operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="sigmoid_benchmark",
                name="Sigmoid",
                description="Sigmoid activation: 1/(1+exp(-x)). Verifiable: sigmoid(0) = 0.5. Classic binary classification activation.",
                architecture="Activation",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("sigmoid operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="tanh_benchmark",
                name="Tanh",
                description="Hyperbolic tangent: (e^x - e^-x)/(e^x + e^-x). Verifiable: tanh(0) = 0. Used in RNNs and LSTMs.",
                architecture="Activation",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("tanh operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="gelu_benchmark",
                name="GELU",
                description="Gaussian Error Linear Unit. Verifiable: gelu(1) ~ 0.841. The activation used in BERT, GPT, transformers.",
                architecture="Activation",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("GELU operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="silu_benchmark",
                name="SiLU (Swish)",
                description="Sigmoid Linear Unit: x * sigmoid(x). Verifiable: silu(1) ~ 0.731. Popular in EfficientNet.",
                architecture="Activation",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("SiLU operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        # ==================== PIPELINES ====================

        self.register(
            ModelInfo(
                id="chain_benchmark",
                name="Chain: Add->ReLU->Mul",
                description="Simulates a layer: (input + bias) -> ReLU -> scale. Common pattern in neural network forward passes.",
                architecture="Pipeline",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("chain operations"),
                supported_chips=["wormhole", "blackhole"],
            )
        )

        self.register(
            ModelInfo(
                id="chain_gelu_mul",
                name="Chain: GELU->Mul",
                description="Transformer FFN pattern: GELU activation followed by scaling. Used in feed-forward layers of transformers.",
                architecture="Pipeline",
                input_shape=[32, 32],
                output_shape=[32, 32],
                estimated_params=0,
                parameters=_make_standard_params("chain operations"),
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
