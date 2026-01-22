import type { ReactNode } from 'react';
import { useMemo } from 'react';

export type VisualizationType = 'line' | 'surface' | 'heatmap';

export interface ChartConfig {
  visualizationType: VisualizationType;
  showLegend: boolean;
  colorScheme: 'viridis' | 'plasma' | 'purple';
}

interface ChartConfigPanelProps {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
  is2DSweep: boolean;
}

const VISUALIZATION_OPTIONS: { value: VisualizationType; label: string; icon: ReactNode; description: string }[] = [
  {
    value: 'line',
    label: '2D Line',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
      </svg>
    ),
    description: 'Compare series with X-axis parameter',
  },
  {
    value: 'surface',
    label: '3D Surface',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Explore full parameter space in 3D',
  },
  {
    value: 'heatmap',
    label: 'Heatmap',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
    description: 'Color-coded 2D grid view',
  },
];

const COLOR_SCHEMES = [
  { value: 'plasma', label: 'Sunset', colors: ['#bd3786', '#f89540', '#f0f921'] },
  { value: 'viridis', label: 'Ocean', colors: ['#21918c', '#5ec962', '#fde725'] },
  { value: 'purple', label: 'Violet', colors: ['#7c3aed', '#a78bfa', '#c4b5fd'] },  
] as const;

export function ChartConfigPanel({ config, onChange, is2DSweep }: ChartConfigPanelProps) {
  // Filter visualization options based on sweep type
  const availableOptions = useMemo(() => {
    if (is2DSweep) {
      return VISUALIZATION_OPTIONS;
    }
    // For 1D sweeps, only line charts make sense
    return VISUALIZATION_OPTIONS.filter(opt => opt.value === 'line');
  }, [is2DSweep]);

  const handleVisualizationChange = (type: VisualizationType) => {
    onChange({ ...config, visualizationType: type });
  };

  const handleColorSchemeChange = (scheme: ChartConfig['colorScheme']) => {
    onChange({ ...config, colorScheme: scheme });
  };

  const handleLegendToggle = () => {
    onChange({ ...config, showLegend: !config.showLegend });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-tt-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-sm font-semibold text-white">Chart Settings</h3>
      </div>

      {/* Visualization Type */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">Visualization</label>
        <div className="grid grid-cols-1 gap-2">
          {availableOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleVisualizationChange(option.value)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                config.visualizationType === option.value
                  ? 'border-tt-purple bg-tt-purple/10 text-white'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
              }`}
            >
              <div className={config.visualizationType === option.value ? 'text-tt-purple' : 'text-gray-400'}>
                {option.icon}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color Theme */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">Color Theme</label>
        <div className="grid grid-cols-3 gap-1">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.value}
              onClick={() => handleColorSchemeChange(scheme.value)}
              className={`p-1.5 rounded-lg border transition-all ${
                config.colorScheme === scheme.value
                  ? 'border-tt-purple bg-tt-purple/10'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
              title={scheme.label}
            >
              <div className="flex gap-0.5 justify-center mb-1">
                {scheme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="text-[10px] text-gray-400 truncate">{scheme.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Show Legend Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">Show Legend</label>
        <button
          onClick={handleLegendToggle}
          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
            config.showLegend ? 'bg-tt-purple' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
              config.showLegend ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Info for 1D sweeps */}
      {!is2DSweep && (
        <div className="pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            💡 Enable Parameter 2 to unlock 3D surface and heatmap visualizations
          </p>
        </div>
      )}
    </div>
  );
}

export default ChartConfigPanel;
