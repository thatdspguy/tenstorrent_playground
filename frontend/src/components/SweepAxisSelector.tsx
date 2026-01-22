import { useMemo } from 'react';
import type { ModelParameter } from '../api/types';

export type ParameterMode = 'fixed' | 'range';

export interface RangeConfig {
  start: number;
  end: number;
  numPoints: number;
  scale: 'linear' | 'logarithmic';
}

export interface AxisSelectorConfig {
  mode: ParameterMode;
  fixedValue: number;
  rangeConfig: RangeConfig;
}

interface SweepAxisSelectorProps {
  label: string;
  parameters: ModelParameter[];
  selectedParameter: string | null;
  config: RangeConfig;
  mode?: ParameterMode;
  fixedValue?: number;
  excludeParameters?: string[];
  allowNone?: boolean;
  showModeToggle?: boolean;
  onChange: (paramName: string | null, config: RangeConfig, mode?: ParameterMode, fixedValue?: number) => void;
}

function generatePreviewValues(config: RangeConfig): number[] {
  const { start, end, numPoints, scale } = config;
  if (numPoints < 2) return [start];
  
  const values: number[] = [];
  if (scale === 'linear') {
    const step = (end - start) / (numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
      values.push(Math.round(start + step * i));
    }
  } else {
    const logStart = Math.log(Math.max(start, 1));
    const logEnd = Math.log(Math.max(end, 1));
    const logStep = (logEnd - logStart) / (numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
      values.push(Math.round(Math.exp(logStart + logStep * i)));
    }
  }
  return [...new Set(values)];
}

export function SweepAxisSelector({
  label,
  parameters,
  selectedParameter,
  config,
  mode = 'range',
  fixedValue,
  excludeParameters = [],
  allowNone = false,
  showModeToggle = false,
  onChange,
}: SweepAxisSelectorProps) {
  // Get sweepable parameters (excluding ones used by other axes)
  const availableParams = useMemo(() => {
    return parameters.filter(p => 
      p.sweepable && !excludeParameters.includes(p.name)
    );
  }, [parameters, excludeParameters]);

  const selectedParam = useMemo(() => {
    return parameters.find(p => p.name === selectedParameter);
  }, [parameters, selectedParameter]);

  const previewValues = useMemo(() => {
    if (!selectedParameter || mode === 'fixed') return [];
    return generatePreviewValues(config);
  }, [selectedParameter, config, mode]);

  const currentFixedValue = fixedValue ?? Number(selectedParam?.default ?? config.start);

  const handleParameterSelect = (paramName: string) => {
    if (paramName === '') {
      onChange(null, config, mode, currentFixedValue);
    } else {
      const param = parameters.find(p => p.name === paramName);
      if (param) {
        // Set sensible defaults from param definition
        const newConfig: RangeConfig = {
          start: Number(param.min ?? 1),
          end: Number(param.max ?? 100),
          numPoints: 5,
          scale: 'linear',
        };
        onChange(paramName, newConfig, mode, Number(param.default ?? param.min ?? 1));
      }
    }
  };

  const updateConfig = (updates: Partial<RangeConfig>) => {
    onChange(selectedParameter, { ...config, ...updates }, mode, currentFixedValue);
  };

  const handleModeChange = (newMode: ParameterMode) => {
    onChange(selectedParameter, config, newMode, currentFixedValue);
  };

  const handleFixedValueChange = (value: number) => {
    onChange(selectedParameter, config, mode, value);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 min-w-[200px]">
      {/* Label and Mode Toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-400">{label}</div>
        {showModeToggle && selectedParameter && (
          <div className="flex bg-gray-700 rounded-md p-0.5">
            <button
              onClick={() => handleModeChange('fixed')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                mode === 'fixed'
                  ? 'bg-tt-purple text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fixed
            </button>
            <button
              onClick={() => handleModeChange('range')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                mode === 'range'
                  ? 'bg-tt-purple text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Range
            </button>
          </div>
        )}
      </div>
      
      {/* Parameter Dropdown */}
      <select
        value={selectedParameter ?? ''}
        onChange={(e) => handleParameterSelect(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-tt-purple mb-2"
      >
        {allowNone && (
          <option value="">None</option>
        )}
        {availableParams.map((param) => (
          <option key={param.name} value={param.name}>
            {param.display_name}
          </option>
        ))}
      </select>

      {/* Fixed value mode */}
      {selectedParameter && mode === 'fixed' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={selectedParam?.min ?? 1}
              max={selectedParam?.max ?? 100}
              value={currentFixedValue}
              onChange={(e) => handleFixedValueChange(Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tt-purple"
            />
            <input
              type="number"
              min={selectedParam?.min ?? 1}
              max={selectedParam?.max ?? 10000}
              value={currentFixedValue}
              onChange={(e) => handleFixedValueChange(Number(e.target.value))}
              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-tt-purple"
            />
          </div>
          <p className="text-xs text-gray-500">Fixed at: <span className="text-gray-300 font-mono">{currentFixedValue}</span></p>
        </div>
      )}

      {/* Range configuration - only show when in range mode */}
      {selectedParameter && mode === 'range' && (
        <div className="space-y-2">
          {/* Start/End Row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Start</label>
              <input
                type="number"
                min={selectedParam?.min ?? 1}
                max={selectedParam?.max ?? 10000}
                value={config.start}
                onChange={(e) => updateConfig({ start: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-tt-purple"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">End</label>
              <input
                type="number"
                min={selectedParam?.min ?? 1}
                max={selectedParam?.max ?? 10000}
                value={config.end}
                onChange={(e) => updateConfig({ end: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-tt-purple"
              />
            </div>
          </div>

          {/* Points and Scale Row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Points</label>
              <input
                type="number"
                min={2}
                max={20}
                value={config.numPoints}
                onChange={(e) => updateConfig({ numPoints: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-tt-purple"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Scale</label>
              <select
                value={config.scale}
                onChange={(e) => updateConfig({ scale: e.target.value as 'linear' | 'logarithmic' })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-tt-purple"
              >
                <option value="linear">Linear</option>
                <option value="logarithmic">Log</option>
              </select>
            </div>
          </div>

          {/* Preview Values */}
          {previewValues.length > 0 && (
            <div className="pt-1 border-t border-gray-700 mt-2">
              <p className="text-xs text-gray-500 mb-1">Values:</p>
              <p className="text-xs text-gray-400 font-mono">
                {previewValues.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SweepAxisSelector;
