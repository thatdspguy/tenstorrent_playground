import { useMemo } from 'react';
import type { SweepSimulationResult } from '../api/types';

interface SweepProgressProps {
  result: SweepSimulationResult;
  onCancel: () => void;
}

export function SweepProgress({ result, onCancel }: SweepProgressProps) {
  const progress = result.total_points > 0 
    ? (result.completed_points / result.total_points) * 100 
    : 0;
  
  const isRunning = result.status === 'running' || result.status === 'pending';
  
  // Estimate remaining time based on completed points
  const estimatedTimeRemaining = useMemo(() => {
    if (!isRunning || result.completed_points === 0) return null;
    
    const startTime = result.created_at ? new Date(result.created_at).getTime() : Date.now();
    const elapsed = Date.now() - startTime;
    const msPerPoint = elapsed / result.completed_points;
    const remaining = (result.total_points - result.completed_points) * msPerPoint;
    
    if (remaining < 1000) return 'less than a second';
    if (remaining < 60000) return `~${Math.ceil(remaining / 1000)} seconds`;
    return `~${Math.ceil(remaining / 60000)} minutes`;
  }, [result, isRunning]);

  // Format axis info for display
  const formatAxisInfo = (_name: string, values: number[] | null | undefined): string => {
    if (!values || values.length === 0) return 'N/A';
    if (values.length === 1) return `${values[0]}`;
    return `${values[0]}→${values[values.length - 1]}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="w-2 h-2 bg-tt-purple rounded-full animate-pulse" />
          )}
          <h3 className="text-sm font-medium text-white">
            {result.status === 'pending' && 'Starting sweep...'}
            {result.status === 'running' && 'Running sweep...'}
            {result.status === 'completed' && 'Sweep completed'}
            {result.status === 'cancelled' && 'Sweep cancelled'}
            {result.status === 'failed' && 'Sweep failed'}
          </h3>
        </div>
        {isRunning && (
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-red-400 border border-red-400/50 rounded hover:bg-red-400/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-tt-purple to-tt-purple-light transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress details */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          {result.completed_points} / {result.total_points} points
          <span className="text-gray-500 ml-2">({Math.round(progress)}%)</span>
        </span>
        {estimatedTimeRemaining && isRunning && (
          <span className="text-gray-500">
            Est. remaining: {estimatedTimeRemaining}
          </span>
        )}
      </div>

      {/* Error message if failed */}
      {result.error && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
          {result.error}
        </div>
      )}

      {/* Sweep configuration summary */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          <span>
            <span className="text-gray-500">Model:</span>{' '}
            <span className="text-gray-300">{result.model_name}</span>
          </span>
          <span>
            <span className="text-gray-500">Type:</span>{' '}
            <span className="text-gray-300">
              {result.sweep_type === '2d' && '2D Sweep'}
              {result.sweep_type === '1d' && '1D Sweep'}
            </span>
          </span>
          <span>
            <span className="text-gray-500">X-Axis ({result.x_axis_name}):</span>{' '}
            <span className="text-gray-300 font-mono">
              {formatAxisInfo(result.x_axis_name, result.x_axis_values)}
            </span>
          </span>
          {result.y_axis_name && result.y_axis_values && (
            <span>
              <span className="text-gray-500">Y-Axis ({result.y_axis_name}):</span>{' '}
              <span className="text-gray-300 font-mono">
                {formatAxisInfo(result.y_axis_name, result.y_axis_values)}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SweepProgress;
