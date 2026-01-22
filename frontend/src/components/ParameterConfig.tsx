import { useEffect } from 'react';
import type { ModelInfo, ModelParameter } from '../api/types';

interface ParameterConfigProps {
  model: ModelInfo;
  values: Record<string, number | string | boolean>;
  onChange: (values: Record<string, number | string | boolean>) => void;
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
  onChange,
}: ParameterConfigProps) {
  // Initialize values from defaults when model changes
  useEffect(() => {
    const defaults: Record<string, number | string | boolean> = {};
    model.parameters.forEach((param) => {
      defaults[param.name] = param.default;
    });
    onChange(defaults);
  }, [model.id]);

  const handleParamChange = (
    name: string,
    value: number | string | boolean
  ) => {
    onChange({ ...values, [name]: value });
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
      <h3 className="text-base font-semibold text-white">Parameters</h3>
      <div className="grid gap-3">
        {model.parameters.map((param) => (
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
        ))}
      </div>
    </div>
  );
}

export default ParameterConfig;
