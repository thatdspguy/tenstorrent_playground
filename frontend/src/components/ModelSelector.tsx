import type { ModelInfo } from '../api/types';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  onSelectModel: (model: ModelInfo) => void;
  loading?: boolean;
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
        <div className="h-8 bg-gray-700 rounded mb-4 w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">Select a Model</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model)}
            className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedModel?.id === model.id
                ? 'border-tt-purple bg-tt-purple/10 shadow-lg shadow-tt-purple/20'
                : 'border-gray-700 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white">{model.name}</h3>
                <span className="text-xs text-tt-purple-light bg-tt-purple/20 px-2 py-0.5 rounded-full">
                  {model.architecture}
                </span>
              </div>
              {selectedModel?.id === model.id && (
                <svg
                  className="w-5 h-5 text-tt-purple"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
              {model.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span>
                Input: [{model.input_shape.join('×')}]
              </span>
              <span>
                Output: [{model.output_shape.join('×')}]
              </span>
              {model.estimated_params > 0 && (
                <span>{(model.estimated_params / 1000).toFixed(1)}K params</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ModelSelector;
