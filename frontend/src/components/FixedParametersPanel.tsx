import { useState } from 'react';
import type { ModelParameter } from '../api/types';

interface FixedParametersPanelProps {
  parameters: ModelParameter[];
  values: Record<string, number | string | boolean>;
  excludeParameters: string[];
  onChange: (values: Record<string, number | string | boolean>) => void;
}

export function FixedParametersPanel({
  parameters,
  values,
  excludeParameters,
  onChange,
}: FixedParametersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out parameters that are being swept
  const fixedParams = parameters.filter(p => !excludeParameters.includes(p.name));

  if (fixedParams.length === 0) {
    return null;
  }

  const handleValueChange = (name: string, value: number | string | boolean) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800/50">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">Fixed Parameters</span>
          <span className="text-xs text-gray-500">
            ({fixedParams.map(p => `${p.display_name}: ${values[p.name] ?? p.default}`).join(', ')})
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-700">
          {fixedParams.map((param) => (
            <div key={param.name} className="pt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-400">
                  {param.display_name}
                </label>
                {param.min !== undefined && param.max !== undefined && (
                  <span className="text-xs text-gray-600">
                    {param.min} - {param.max}
                  </span>
                )}
              </div>
              
              {param.type === 'select' && param.options ? (
                <select
                  value={String(values[param.name] ?? param.default)}
                  onChange={(e) => handleValueChange(param.name, e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-tt-purple"
                >
                  {param.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : param.type === 'bool' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(values[param.name] ?? param.default)}
                    onChange={(e) => handleValueChange(param.name, e.target.checked)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-tt-purple focus:ring-tt-purple"
                  />
                  <span className="text-sm text-gray-300">Enabled</span>
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={param.min ?? 1}
                    max={param.max ?? 100}
                    step={param.type === 'float' ? 0.1 : 1}
                    value={Number(values[param.name] ?? param.default)}
                    onChange={(e) => handleValueChange(param.name, Number(e.target.value))}
                    className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tt-purple"
                  />
                  <input
                    type="number"
                    min={param.min}
                    max={param.max}
                    step={param.type === 'float' ? 0.1 : 1}
                    value={Number(values[param.name] ?? param.default)}
                    onChange={(e) => handleValueChange(param.name, Number(e.target.value))}
                    className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-tt-purple"
                  />
                </div>
              )}
              
              <p className="text-xs text-gray-600 mt-1">{param.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FixedParametersPanel;
