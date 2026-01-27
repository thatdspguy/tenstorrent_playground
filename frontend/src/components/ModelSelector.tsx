import type { ModelInfo } from '../api/types';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  onSelectModel: (model: ModelInfo) => void;
  loading?: boolean;
}

/**
 * Get an SVG icon representing the operation type
 */
function getOperationIcon(modelId: string): React.ReactNode {
  const iconClass = "w-full h-full";
  
  switch (modelId) {
    case 'add_benchmark':
      // Plus sign for addition
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="32" cy="32" r="26" className="stroke-current opacity-20" />
          <line x1="32" y1="18" x2="32" y2="46" className="stroke-current" strokeLinecap="round" />
          <line x1="18" y1="32" x2="46" y2="32" className="stroke-current" strokeLinecap="round" />
        </svg>
      );
    case 'subtract_benchmark':
      // Circle with horizontal line (minus in circle)
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="32" cy="32" r="26" className="stroke-current opacity-20" />
          <line x1="18" y1="32" x2="46" y2="32" className="stroke-current" strokeLinecap="round" />
        </svg>
      );
    case 'multiply_benchmark':
      // X sign for multiplication
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="32" cy="32" r="26" className="stroke-current opacity-20" />
          <line x1="22" y1="22" x2="42" y2="42" className="stroke-current" strokeLinecap="round" />
          <line x1="42" y1="22" x2="22" y2="42" className="stroke-current" strokeLinecap="round" />
        </svg>
      );
    case 'exp_benchmark':
      // Exponential curve
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M12 48 Q 24 46, 32 36 T 52 12" className="stroke-current" strokeLinecap="round" fill="none" />
          <text x="40" y="52" className="fill-current text-[10px] font-bold">eˣ</text>
        </svg>
      );
    case 'relu_benchmark':
      // ReLU function shape
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <line x1="12" y1="40" x2="32" y2="40" className="stroke-current" strokeLinecap="round" />
          <line x1="32" y1="40" x2="52" y2="16" className="stroke-current" strokeLinecap="round" />
        </svg>
      );
    case 'sigmoid_benchmark':
      // S-curve for sigmoid
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M12 48 C 20 48, 28 32, 32 32 S 44 16, 52 16" className="stroke-current" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'gelu_benchmark':
      // GELU-like smooth curve
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M12 42 Q 20 44, 26 38 T 38 26 Q 44 20, 52 16" className="stroke-current" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'tanh_benchmark':
      // Tanh S-curve (steeper than sigmoid)
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M12 50 C 22 50, 28 32, 32 32 S 42 14, 52 14" className="stroke-current" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'softmax_benchmark':
      // Distribution-like bars
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <rect x="14" y="38" width="6" height="12" rx="1" className="fill-current opacity-60" />
          <rect x="24" y="24" width="6" height="26" rx="1" className="fill-current opacity-80" />
          <rect x="34" y="30" width="6" height="20" rx="1" className="fill-current opacity-70" />
          <rect x="44" y="42" width="6" height="8" rx="1" className="fill-current opacity-50" />
        </svg>
      );
    case 'layernorm_benchmark':
      // Normalized distribution
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M12 44 Q 22 44, 27 28 T 32 20 T 37 28 Q 42 44, 52 44" className="stroke-current" strokeLinecap="round" fill="none" />
          <line x1="32" y1="16" x2="32" y2="48" className="stroke-current opacity-30" strokeDasharray="2,2" />
        </svg>
      );
    case 'sqrt_benchmark':
      // Square root symbol
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M14 36 L 22 44 L 32 20 L 50 20" className="stroke-current" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'reciprocal_benchmark':
      // 1/x curve
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M16 16 Q 24 24, 32 32 Q 40 40, 52 52" className="stroke-current opacity-30" strokeDasharray="2,2" />
          <path d="M52 16 Q 36 20, 32 32 Q 28 44, 16 52" className="stroke-current" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'log_benchmark':
      // Logarithm curve
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <path d="M16 52 Q 24 24, 36 20 T 52 16" className="stroke-current" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'matmul_benchmark':
      // Matrix multiplication grid with @ symbol
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          {/* Left matrix */}
          <rect x="12" y="20" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          <rect x="12" y="28" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          <rect x="20" y="20" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          <rect x="20" y="28" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          {/* @ symbol */}
          <text x="32" y="32" textAnchor="middle" dominantBaseline="middle" className="fill-current text-[12px] font-bold">@</text>
          {/* Right matrix */}
          <rect x="38" y="20" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          <rect x="38" y="28" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          <rect x="46" y="20" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
          <rect x="46" y="28" width="6" height="6" rx="1" className="stroke-current fill-current opacity-40" />
        </svg>
      );
    case 'simple_mlp':
      // Neural network with layers
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          {/* Input layer - 3 nodes */}
          <circle cx="16" cy="20" r="4" className="stroke-current fill-current opacity-30" />
          <circle cx="16" cy="32" r="4" className="stroke-current fill-current opacity-30" />
          <circle cx="16" cy="44" r="4" className="stroke-current fill-current opacity-30" />
          {/* Hidden layer - 4 nodes */}
          <circle cx="32" cy="16" r="4" className="stroke-current fill-current opacity-50" />
          <circle cx="32" cy="26" r="4" className="stroke-current fill-current opacity-50" />
          <circle cx="32" cy="38" r="4" className="stroke-current fill-current opacity-50" />
          <circle cx="32" cy="48" r="4" className="stroke-current fill-current opacity-50" />
          {/* Output layer - 2 nodes */}
          <circle cx="48" cy="26" r="4" className="stroke-current fill-current opacity-70" />
          <circle cx="48" cy="38" r="4" className="stroke-current fill-current opacity-70" />
          {/* Connections - input to hidden */}
          <line x1="20" y1="20" x2="28" y2="16" className="stroke-current opacity-20" />
          <line x1="20" y1="20" x2="28" y2="26" className="stroke-current opacity-20" />
          <line x1="20" y1="32" x2="28" y2="26" className="stroke-current opacity-20" />
          <line x1="20" y1="32" x2="28" y2="38" className="stroke-current opacity-20" />
          <line x1="20" y1="44" x2="28" y2="38" className="stroke-current opacity-20" />
          <line x1="20" y1="44" x2="28" y2="48" className="stroke-current opacity-20" />
          {/* Connections - hidden to output */}
          <line x1="36" y1="16" x2="44" y2="26" className="stroke-current opacity-20" />
          <line x1="36" y1="26" x2="44" y2="26" className="stroke-current opacity-20" />
          <line x1="36" y1="38" x2="44" y2="38" className="stroke-current opacity-20" />
          <line x1="36" y1="48" x2="44" y2="38" className="stroke-current opacity-20" />
        </svg>
      );
    default:
      // Generic tensor operation
      return (
        <svg className={iconClass} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="48" height="48" rx="4" className="stroke-current opacity-20" />
          <rect x="16" y="16" width="12" height="12" rx="2" className="stroke-current" />
          <rect x="36" y="16" width="12" height="12" rx="2" className="stroke-current" />
          <rect x="16" y="36" width="12" height="12" rx="2" className="stroke-current" />
          <rect x="36" y="36" width="12" height="12" rx="2" className="stroke-current" />
        </svg>
      );
  }
}

/**
 * Get a short display name for the operation
 */
function getShortName(model: ModelInfo): string {
  return model.name.replace(' Benchmark', '').replace(' Operation', '');
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  loading = false,
}: ModelSelectorProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-700 rounded mb-3 w-36"></div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="w-[144px] h-[144px] bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 mb-3">Select Operation</h2>
      <div className="grid grid-cols-4 gap-3">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model)}
            title={`${model.name}\n${model.description}`}
            className={`relative flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-200 group ${
              selectedModel?.id === model.id
                ? 'border-tt-purple bg-tt-purple/15 shadow-lg shadow-tt-purple/30 text-tt-purple-light'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            {/* Operation Icon */}
            <div className={`w-20 h-20 mb-2 ${
              selectedModel?.id === model.id ? 'text-tt-purple' : 'text-gray-500 group-hover:text-gray-300'
            }`}>
              {getOperationIcon(model.id)}
            </div>
            
            {/* Operation Name */}
            <span className={`text-sm font-semibold leading-tight text-center ${
              selectedModel?.id === model.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
            }`}>
              {getShortName(model)}
            </span>

            {/* Selected indicator */}
            {selectedModel?.id === model.id && (
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-tt-purple rounded-full border-2 border-gray-900 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ModelSelector;
