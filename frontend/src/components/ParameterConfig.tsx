import { useEffect, useMemo } from 'react';
import type { ModelInfo, ModelParameter, SweepableParameter } from '../api/types';
import { RangeParameterInput } from './RangeParameterInput';

// Parameters that support range/sweep mode
const SWEEPABLE_PARAMS = ['matrix_size', 'batch_size'];

interface ParameterConfigProps {
  model: ModelInfo;
  values: Record<string, number | string | boolean>;
  sweepParams: Record<string, SweepableParameter>;
  onChange: (values: Record<string, number | string | boolean>) => void;
  onSweepChange: (sweepParams: Record<string, SweepableParameter>) => void;
}

function ParameterInput({
  param,
  value,
  onChange,
}: {
  param: ModelParameter;
  value: number | string | boolean;
  onChange: (value: number | string | boolean) => void;
}) {
  if (param.type === 'select' && param.options) {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-tt-purple focus:border-transparent"
      >
        {param.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (param.type === 'bool') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-tt-purple focus:ring-tt-purple focus:ring-offset-gray-800"
        />
        <span className="text-gray-300">Enabled</span>
      </label>
    );
  }

  // int or float
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={param.min ?? 1}
        max={param.max ?? 100}
        step={param.type === 'float' ? 0.1 : 1}
        value={Number(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tt-purple"
      />
      <input
        type="number"
        min={param.min}
        max={param.max}
        step={param.type === 'float' ? 0.1 : 1}
        value={Number(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-center focus:outline-none focus:ring-2 focus:ring-tt-purple focus:border-transparent"
      />
    </div>
  );
}

export function ParameterConfig({
  model,
  values,
  sweepParams,
  onChange,
  onSweepChange,
}: ParameterConfigProps) {
  // Check if any parameter is in range mode
  const hasSweepMode = useMemo(() => {
    return Object.values(sweepParams).some(p => p.mode === 'range');
  }, [sweepParams]);

  // Initialize values from defaults when model changes
  useEffect(() => {
    const defaults: Record<string, number | string | boolean> = {};
    const defaultSweepParams: Record<string, SweepableParameter> = {};
    
    model.parameters.forEach((param) => {
      defaults[param.name] = param.default;
      
      // Initialize sweep params for sweepable parameters
      if (SWEEPABLE_PARAMS.includes(param.name) && param.options) {
        const numericOptions = param.options.map(Number).filter(n => !isNaN(n));
        const minOption = Math.min(...numericOptions);
        const maxOption = Math.max(...numericOptions);
        
        defaultSweepParams[param.name] = {
          mode: 'single',
          singleValue: Number(param.default),
          range: {
            start: minOption,
            end: maxOption,
            num_points: Math.min(5, numericOptions.length),
            scale: 'logarithmic',
          },
        };
      }
    });
    
    onChange(defaults);
    onSweepChange(defaultSweepParams);
  }, [model.id]);

  const handleParamChange = (
    name: string,
    value: number | string | boolean
  ) => {
    onChange({ ...values, [name]: value });
    
    // Also update the sweep param single value if applicable
    if (SWEEPABLE_PARAMS.includes(name) && sweepParams[name]) {
      onSweepChange({
        ...sweepParams,
        [name]: {
          ...sweepParams[name],
          singleValue: Number(value),
        },
      });
    }
  };

  const handleSweepParamChange = (name: string, sweepParam: SweepableParameter) => {
    onSweepChange({
      ...sweepParams,
      [name]: sweepParam,
    });
    
    // Also update the regular param value when in single mode
    if (sweepParam.mode === 'single') {
      onChange({ ...values, [name]: sweepParam.singleValue });
    }
  };

  if (model.parameters.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        This model has no configurable parameters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Parameters</h3>
        {hasSweepMode && (
          <span className="px-2 py-0.5 text-xs font-medium bg-tt-purple/20 text-tt-purple-light border border-tt-purple/30 rounded-full">
            Sweep Mode
          </span>
        )}
      </div>
      <div className="grid gap-3">
        {model.parameters.map((param) => {
          // Use RangeParameterInput for sweepable parameters
          if (SWEEPABLE_PARAMS.includes(param.name) && param.options && sweepParams[param.name]) {
            return (
              <RangeParameterInput
                key={param.name}
                label={param.display_name}
                description={param.description}
                options={param.options}
                value={sweepParams[param.name]}
                onChange={(v) => handleSweepParamChange(param.name, v)}
              />
            );
          }

          // Standard parameter input for non-sweepable params
          return (
            <div key={param.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-300">
                  {param.display_name}
                </label>
                {param.min !== undefined && param.max !== undefined && (
                  <span className="text-xs text-gray-500">
                    {param.min} - {param.max}
                  </span>
                )}
              </div>
              <ParameterInput
                param={param}
                value={values[param.name] ?? param.default}
                onChange={(v) => handleParamChange(param.name, v)}
              />
              <p className="text-xs text-gray-500">{param.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ParameterConfig;
