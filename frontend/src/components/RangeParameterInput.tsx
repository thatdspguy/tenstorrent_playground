import { useMemo } from 'react';
import type { ParameterMode, ParameterRange, ScaleType, SweepableParameter } from '../api/types';

interface RangeParameterInputProps {
  label: string;
  description: string;
  options: string[];  // Valid values like ["32", "64", "128", "256", "512", "1024"]
  value: SweepableParameter;
  onChange: (value: SweepableParameter) => void;
}

/**
 * Generate preview values based on range configuration
 */
function generatePreviewValues(range: ParameterRange): number[] {
  const { start, end, num_points, scale } = range;
  
  if (num_points < 2) return [start];
  
  const values: number[] = [];
  
  if (scale === 'linear') {
    const step = (end - start) / (num_points - 1);
    for (let i = 0; i < num_points; i++) {
      values.push(Math.round(start + step * i));
    }
  } else {
    // Logarithmic scale
    const logStart = Math.log(start);
    const logEnd = Math.log(end);
    const logStep = (logEnd - logStart) / (num_points - 1);
    for (let i = 0; i < num_points; i++) {
      values.push(Math.round(Math.exp(logStart + logStep * i)));
    }
  }
  
  // Remove duplicates while preserving order
  const unique = [...new Set(values)];
  return unique;
}

export function RangeParameterInput({
  label,
  description,
  options,
  value,
  onChange,
}: RangeParameterInputProps) {
  const numericOptions = useMemo(() => options.map(Number).filter(n => !isNaN(n)), [options]);
  const minOption = Math.min(...numericOptions);
  const maxOption = Math.max(...numericOptions);

  const previewValues = useMemo(() => {
    if (value.mode === 'single') return [];
    return generatePreviewValues(value.range);
  }, [value.mode, value.range]);

  const handleModeChange = (mode: ParameterMode) => {
    onChange({
      ...value,
      mode,
      // Initialize range with sensible defaults when switching to range mode
      range: value.range.start === value.range.end ? {
        start: minOption,
        end: maxOption,
        num_points: Math.min(5, numericOptions.length),
        scale: 'logarithmic' as ScaleType,
      } : value.range,
    });
  };

  const handleSingleValueChange = (newValue: number) => {
    onChange({
      ...value,
      singleValue: newValue,
    });
  };

  const handleRangeChange = (updates: Partial<ParameterRange>) => {
    onChange({
      ...value,
      range: { ...value.range, ...updates },
    });
  };

  const isRangeMode = value.mode === 'range';

  return (
    <div className={`space-y-2 p-3 rounded-lg border transition-all duration-200 ${
      isRangeMode 
        ? 'border-tt-purple bg-tt-purple/5' 
        : 'border-gray-700 bg-gray-800/50'
    }`}>
      {/* Header with label and mode toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <div className="flex items-center gap-1 bg-gray-700 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => handleModeChange('single')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              !isRangeMode
                ? 'bg-tt-purple text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('range')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              isRangeMode
                ? 'bg-tt-purple text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Range
          </button>
        </div>
      </div>

      {/* Single value mode */}
      {!isRangeMode && (
        <input
          type="number"
          min={1}
          value={value.singleValue}
          onChange={(e) => handleSingleValueChange(Math.max(1, Number(e.target.value)))}
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tt-purple focus:border-transparent"
        />
      )}

      {/* Range mode */}
      {isRangeMode && (
        <div className="space-y-3">
          {/* Start, End, Points row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Start</label>
              <input
                type="number"
                min={1}
                value={value.range.start}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  handleRangeChange({ start: val });
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-tt-purple focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">End</label>
              <input
                type="number"
                min={1}
                value={value.range.end}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  handleRangeChange({ end: val });
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-tt-purple focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Points</label>
              <input
                type="number"
                min={2}
                max={50}
                value={value.range.num_points}
                onChange={(e) => handleRangeChange({ num_points: Math.max(2, Math.min(50, Number(e.target.value))) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-tt-purple focus:border-transparent"
              />
            </div>
          </div>

          {/* Scale type toggle */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">Scale:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`${label}-scale`}
                checked={value.range.scale === 'linear'}
                onChange={() => handleRangeChange({ scale: 'linear' })}
                className="w-3.5 h-3.5 text-tt-purple bg-gray-700 border-gray-600 focus:ring-tt-purple focus:ring-offset-gray-800"
              />
              <span className="text-xs text-gray-300">Linear</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`${label}-scale`}
                checked={value.range.scale === 'logarithmic'}
                onChange={() => handleRangeChange({ scale: 'logarithmic' })}
                className="w-3.5 h-3.5 text-tt-purple bg-gray-700 border-gray-600 focus:ring-tt-purple focus:ring-offset-gray-800"
              />
              <span className="text-xs text-gray-300">Logarithmic</span>
            </label>
          </div>

          {/* Preview values */}
          {previewValues.length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-400">Preview: </span>
              <span className="text-xs text-tt-purple-light font-mono">
                {previewValues.join(', ')}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                ({previewValues.length} points)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default RangeParameterInput;
