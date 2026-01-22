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
      <h2 className="text-lg font-semibold text-white mb-3">Select a Model</h2>
      <div className="grid grid-cols-2 gap-2">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model)}
            className={`text-left p-2 rounded-lg border transition-all duration-200 ${
              selectedModel?.id === model.id
                ? 'border-tt-purple bg-tt-purple/10 shadow-md shadow-tt-purple/20'
                : 'border-gray-700 bg-gray-800 hover:border-gray-500'
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-medium text-white text-sm leading-tight">{model.name}</h3>
              {selectedModel?.id === model.id && (
                <svg
                  className="w-4 h-4 text-tt-purple flex-shrink-0"
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
            <span className="text-xs text-tt-purple-light bg-tt-purple/20 px-1.5 py-0.5 rounded-full inline-block mt-1">
              {model.architecture}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ModelSelector;
