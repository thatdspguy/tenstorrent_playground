import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api';
import type {
    ModelInfo,
    ParameterRange,
    SimulationJob,
    SimulatorAvailability,
    SweepParameter,
    SweepSimulationResult,
} from '../api/types';
import {
    ModelSelector,
    ResultsChart,
    SimulationStatusDisplay,
    SimulatorSelector,
    type ChipType
} from '../components';
import { ChartConfigPanel, type ChartConfig } from '../components/ChartConfigPanel';
import { DualChartView } from '../components/DualChartView';
import { MLPVisualization } from '../components/MLPVisualization';
import { SweepAxisSelector, type ParameterMode } from '../components/SweepAxisSelector';
import { SweepProgress } from '../components/SweepProgress';

// ============================================================================
// Types
// ============================================================================

interface AxisConfig {
  parameterName: string | null;
  mode: ParameterMode;
  fixedValue: number;
  start: number;
  end: number;
  numPoints: number;
  scale: 'linear' | 'logarithmic';
}

interface MathematicalOperationsPageProps {
  simulators: SimulatorAvailability[];
  selectedChip: ChipType;
  onSelectChip: (chip: ChipType) => void;
}

// ============================================================================
// Mathematical Operations Page Component
// ============================================================================

export function MathematicalOperationsPage({
  simulators,
  selectedChip,
  onSelectChip,
}: MathematicalOperationsPageProps) {
  // Core state
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sweep axis configuration
  const [xAxisConfig, setXAxisConfig] = useState<AxisConfig>({
    parameterName: null,
    mode: 'range',
    fixedValue: 32,
    start: 2,
    end: 32,
    numPoints: 5,
    scale: 'logarithmic',
  });
  const [yAxisConfig, setYAxisConfig] = useState<AxisConfig>({
    parameterName: null,
    mode: 'range',
    fixedValue: 1,
    start: 8,
    end: 128,
    numPoints: 3,
    scale: 'logarithmic',
  });

  // Chart configuration
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    visualizationType: 'line',
    showLegend: true,
    colorScheme: 'plasma',
  });

  // Fixed parameters (non-swept)
  const [fixedParams, setFixedParams] = useState<Record<string, number | string | boolean>>({});

  // Results
  const [currentJob, setCurrentJob] = useState<SimulationJob | null>(null);
  const [sweepResult, setSweepResult] = useState<SweepSimulationResult | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived state - check if any axis is in range mode
  const xIsRange = xAxisConfig.parameterName !== null && xAxisConfig.mode === 'range';
  const yIsRange = yAxisConfig.parameterName !== null && yAxisConfig.mode === 'range';
  const isSweepMode = xIsRange || yIsRange;
  const is2DSweep = xIsRange && yIsRange;
  const sweepableParams = selectedModel?.parameters.filter((p) => p.sweepable) || [];

  // Check if the selected chip's simulator is available
  const isSelectedChipAvailable =
    simulators.find((s) => s.chip === selectedChip)?.available ?? false;

  // ============================================================================
  // Effects
  // ============================================================================

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const modelList = await apiClient.listModels();
        setModels(modelList);
        if (modelList.length > 0) {
          const defaultModel =
            modelList.find((m) => m.id === 'add_benchmark') || modelList[0];
          setSelectedModel(defaultModel);
        }
      } catch (err) {
        setError('Failed to load models. Make sure the server is running.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  // Initialize fixed params when model changes
  useEffect(() => {
    if (selectedModel) {
      const defaults: Record<string, number | string | boolean> = {};
      selectedModel.parameters.forEach((p) => {
        defaults[p.name] = p.default;
      });
      // Preserve iterations value when switching models (default to 50)
      defaults.iterations = fixedParams.iterations ?? 50;
      setFixedParams(defaults);

      // Get sweepable parameters for the new model
      const sweepable = selectedModel.parameters.filter((p) => p.sweepable);

      // Determine default parameter ordering: prefer matrix_size for X, batch_size for Y
      const matrixParam = sweepable.find((p) => p.name === 'matrix_size');
      const batchParam = sweepable.find((p) => p.name === 'batch_size');

      // For X-axis: try to find a matching parameter by name, otherwise use matrix_size or first sweepable
      if (sweepable.length > 0) {
        setXAxisConfig((prev) => {
          const matchingParam = prev.parameterName
            ? sweepable.find((p) => p.name === prev.parameterName)
            : null;
          // Prefer: existing match > matrix_size > first sweepable
          const targetParam = matchingParam || matrixParam || sweepable[0];

          return {
            // Preserve user's settings
            mode: prev.mode,
            numPoints: prev.numPoints,
            scale: prev.scale,
            start: prev.start,
            end: prev.end,
            fixedValue: prev.fixedValue,
            // Update parameter name to match new model
            parameterName: targetParam.name,
          };
        });
      }

      // For Y-axis: try to find a matching parameter by name, otherwise use batch_size or second sweepable
      if (sweepable.length > 1) {
        setYAxisConfig((prev) => {
          const matchingParam = prev.parameterName
            ? sweepable.find((p) => p.name === prev.parameterName)
            : null;

          // Determine what X-axis will use (same logic as above)
          const xAxisParam = sweepable.find((p) => p.name === 'matrix_size') || sweepable[0];

          // Get available params (excluding what X-axis uses)
          const availableParams = sweepable.filter((p) => p.name !== xAxisParam.name);

          // Prefer: existing match (if still available) > batch_size (if available) > first available
          const targetParam =
            (matchingParam && availableParams.find((p) => p.name === matchingParam.name)) ||
            (batchParam && availableParams.find((p) => p.name === batchParam.name)) ||
            availableParams[0];

          return {
            // Preserve user's settings
            mode: prev.mode,
            numPoints: prev.numPoints,
            scale: prev.scale,
            start: prev.start,
            end: prev.end,
            fixedValue: prev.fixedValue,
            // Update parameter name to match new model
            parameterName: targetParam?.name ?? null,
          };
        });
      } else {
        setYAxisConfig((prev) => ({ ...prev, parameterName: null }));
      }
    }
  }, [selectedModel]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const pollSweepStatus = useCallback(async (jobId: string) => {
    try {
      const result = await apiClient.getSweepStatus(jobId);
      setSweepResult(result);

      if (
        result.status === 'completed' ||
        result.status === 'cancelled' ||
        result.status === 'failed'
      ) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Failed to poll sweep status:', err);
    }
  }, []);

  const handleRunSimulation = async () => {
    if (!selectedModel) return;

    setIsRunning(true);
    setCurrentJob(null);
    setSweepResult(null);
    setError(null);

    try {
      if (isSweepMode) {
        // Build sweep request based on mode
        // X-axis: either range or fixed value
        const xAxis: SweepParameter | null = xAxisConfig.parameterName
          ? {
              name: xAxisConfig.parameterName,
              values:
                xAxisConfig.mode === 'range'
                  ? ({
                      start: xAxisConfig.start,
                      end: xAxisConfig.end,
                      num_points: xAxisConfig.numPoints,
                      scale: xAxisConfig.scale,
                    } as ParameterRange)
                  : xAxisConfig.fixedValue, // Fixed value as single number
            }
          : null;

        // Y-axis: either range or fixed value
        const yAxis: SweepParameter | null = yAxisConfig.parameterName
          ? {
              name: yAxisConfig.parameterName,
              values:
                yAxisConfig.mode === 'range'
                  ? ({
                      start: yAxisConfig.start,
                      end: yAxisConfig.end,
                      num_points: yAxisConfig.numPoints,
                      scale: yAxisConfig.scale,
                    } as ParameterRange)
                  : yAxisConfig.fixedValue, // Fixed value as single number
            }
          : null;

        // Build fixed parameters (exclude axis params)
        const fixed: Record<string, number | string | boolean> = {};
        Object.entries(fixedParams).forEach(([key, value]) => {
          if (key !== xAxisConfig.parameterName && key !== yAxisConfig.parameterName) {
            fixed[key] = value;
          }
        });

        const result = await apiClient.runSweep({
          model_id: selectedModel.id,
          x_axis: xAxis ?? undefined,
          y_axis: yAxis ?? undefined,
          fixed_parameters: fixed,
          iterations: Number(fixedParams.iterations) || 50,
          chip: selectedChip,
        });

        setSweepResult(result);

        // Start polling for updates
        pollIntervalRef.current = setInterval(() => {
          pollSweepStatus(result.job_id);
        }, 1000);
      } else {
        // Regular single simulation
        const job = await apiClient.runSimulation({
          model_id: selectedModel.id,
          batch_size: Number(fixedParams.batch_size) || 1,
          iterations: Number(fixedParams.iterations) || 50,
          parameters: fixedParams,
          chip: selectedChip,
        });
        setCurrentJob(job);
        setIsRunning(false);
      }
    } catch (err) {
      setError('Simulation failed. Check console for details.');
      console.error(err);
      setIsRunning(false);
    }
  };

  const handleCancelSweep = async () => {
    if (!sweepResult) return;

    try {
      await apiClient.cancelSweep(sweepResult.job_id);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsRunning(false);
    } catch (err) {
      console.error('Failed to cancel sweep:', err);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Page Header with Chip Selector */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Mathematical Operations</h1>
            <p className="text-gray-400 text-sm mt-1">
              Benchmark TTNN operations with parameter sweeps
            </p>
          </div>

          {/* Chip Selector */}
          <div className="flex items-center gap-3">
            {!isSelectedChipAvailable && (
              <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                Simulator offline - using CPU fallback
              </span>
            )}
            <SimulatorSelector
              selectedChip={selectedChip}
              onSelectChip={onSelectChip}
              simulators={simulators}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      {/* Control Bar - Grid Layout */}
      <div className="flex-shrink-0 px-4 py-4 sm:px-6 lg:px-8 border-b border-gray-700 bg-gray-800/50">
        <div className="flex gap-4">
          {/* Left: Model Selector (3x4 grid) */}
          <div className="flex-shrink-0">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              loading={isLoading}
            />
          </div>

          {/* Right: Parameters and Run Button */}
          {selectedModel && (
            <div className="flex-1 flex flex-col gap-3">
              {/* Row 1: Run Sweep Button - Full Width */}
              <button
                onClick={handleRunSimulation}
                disabled={isRunning || !isSelectedChipAvailable}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isRunning || !isSelectedChipAvailable
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : isSweepMode
                      ? 'bg-gradient-to-r from-tt-purple to-indigo-600 hover:from-tt-purple-dark hover:to-indigo-700 text-white shadow-lg shadow-tt-purple/25 hover:shadow-tt-purple/40'
                      : 'bg-tt-purple hover:bg-tt-purple-dark text-white shadow-lg shadow-tt-purple/25 hover:shadow-tt-purple/40'
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Running...
                  </span>
                ) : isSweepMode ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    {is2DSweep ? 'Run 2D Sweep' : 'Run 1D Sweep'}
                  </span>
                ) : (
                  'Run Simulation'
                )}
              </button>

              {/* MLP Visualization (when simple_mlp is selected) */}
              {selectedModel.id === 'simple_mlp' ? (
                <MLPVisualization
                  inputSize={Number(fixedParams.input_size) || 64}
                  hiddenSize={Number(fixedParams.hidden_size) || 64}
                  outputSize={Number(fixedParams.output_size) || 32}
                  batchSize={Number(fixedParams.batch_size) || 32}
                  onConfigChange={(config) => {
                    setFixedParams((prev) => ({
                      ...prev,
                      input_size: config.inputSize,
                      hidden_size: config.hiddenSize,
                      output_size: config.outputSize,
                      batch_size: config.batchSize,
                    }));
                  }}
                />
              ) : (
                <>
                  {/* Row 2: Parameter 1 and Parameter 2 Controls side by side */}
                  <div className="flex gap-3">
                    {sweepableParams.length > 0 && (
                      <div className="flex-1">
                        <SweepAxisSelector
                          label="Parameter 1"
                          parameters={sweepableParams}
                          selectedParameter={xAxisConfig.parameterName}
                          config={{
                            start: xAxisConfig.start,
                            end: xAxisConfig.end,
                            numPoints: xAxisConfig.numPoints,
                            scale: xAxisConfig.scale,
                          }}
                          mode={xAxisConfig.mode}
                          fixedValue={xAxisConfig.fixedValue}
                          excludeParameters={
                            yAxisConfig.parameterName ? [yAxisConfig.parameterName] : []
                          }
                          showModeToggle
                          onChange={(param, config, mode, fixedValue) => {
                            setXAxisConfig({
                              parameterName: param,
                              mode: mode ?? 'range',
                              fixedValue: fixedValue ?? config.start,
                              ...config,
                            });
                          }}
                        />
                      </div>
                    )}

                    {sweepableParams.length > 1 && (
                      <div className="flex-1">
                        <SweepAxisSelector
                          label="Parameter 2"
                          parameters={sweepableParams}
                          selectedParameter={yAxisConfig.parameterName}
                          config={{
                            start: yAxisConfig.start,
                            end: yAxisConfig.end,
                            numPoints: yAxisConfig.numPoints,
                            scale: yAxisConfig.scale,
                          }}
                          mode={yAxisConfig.mode}
                          fixedValue={yAxisConfig.fixedValue}
                          excludeParameters={
                            xAxisConfig.parameterName ? [xAxisConfig.parameterName] : []
                          }
                          allowNone
                          showModeToggle
                          onChange={(param, config, mode, fixedValue) => {
                            setYAxisConfig({
                              parameterName: param,
                              mode: mode ?? 'range',
                              fixedValue: fixedValue ?? config.start,
                              ...config,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Row 3: Iterations - Full Width */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <label className="text-xs font-medium text-gray-400 mb-2 block">Iterations</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={Number(fixedParams.iterations ?? 50)}
                    onChange={(e) =>
                      setFixedParams((prev) => ({
                        ...prev,
                        iterations: Number(e.target.value),
                      }))
                    }
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tt-purple"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={Number(fixedParams.iterations ?? 50)}
                    onChange={(e) =>
                      setFixedParams((prev) => ({
                        ...prev,
                        iterations: Number(e.target.value),
                      }))
                    }
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-tt-purple"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Area - Full width below controls */}
      <div className="flex-1 overflow-auto p-4 sm:px-6 lg:px-8">
        {/* Sweep Progress */}
        {sweepResult && (sweepResult.status === 'running' || sweepResult.status === 'pending') && (
          <SweepProgress result={sweepResult} onCancel={handleCancelSweep} />
        )}

        {/* Sweep Results - Chart Config + Dual Chart View */}
        {sweepResult && sweepResult.status === 'completed' && sweepResult.data_points.length > 0 && (
          <div className="flex gap-4">
            {/* Chart Configuration Panel */}
            <div className="flex-shrink-0 w-56">
              <ChartConfigPanel
                config={chartConfig}
                onChange={setChartConfig}
                is2DSweep={sweepResult.sweep_type === '2d'}
              />
            </div>
            {/* Charts */}
            <div className="flex-1 min-w-0">
              <DualChartView result={sweepResult} config={chartConfig} />
            </div>
          </div>
        )}

        {/* Single Simulation Status */}
        {!sweepResult && <SimulationStatusDisplay job={currentJob} isRunning={isRunning} />}

        {/* Single Simulation Results */}
        {!sweepResult && currentJob?.status === 'completed' && currentJob.result && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <ResultsChart result={currentJob.result} />
          </div>
        )}

        {/* Empty state */}
        {!currentJob && !sweepResult && !isRunning && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 mb-3 rounded-full bg-gray-700 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-base font-medium text-white mb-1">Ready to Simulate</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Select a model, configure sweep parameters, and click "Run Sweep" to explore
              performance across parameter ranges
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
