import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from './api';
import type {
  ModelInfo,
  ParameterRange,
  SimulationJob,
  SweepParameter,
  SweepSimulationResult,
} from './api/types';
import { ModelSelector, ResultsChart, SimulationStatusDisplay } from './components';
import { DualChartView } from './components/DualChartView';
import { SweepAxisSelector, type ParameterMode } from './components/SweepAxisSelector';
import { SweepProgress } from './components/SweepProgress';

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

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  // Core state
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [simulatorAvailable, setSimulatorAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sweep axis configuration
  const [xAxisConfig, setXAxisConfig] = useState<AxisConfig>({
    parameterName: null,
    mode: 'range',
    fixedValue: 32,
    start: 32,
    end: 512,
    numPoints: 5,
    scale: 'linear',
  });
  const [yAxisConfig, setYAxisConfig] = useState<AxisConfig>({
    parameterName: null,
    mode: 'range',
    fixedValue: 1,
    start: 1,
    end: 16,
    numPoints: 4,
    scale: 'linear',
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

  // ============================================================================
  // Effects
  // ============================================================================

  // Load models on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [health, modelList] = await Promise.all([
          apiClient.getHealth(),
          apiClient.listModels(),
        ]);
        setSimulatorAvailable(health.simulator_available);
        setModels(modelList);
        if (modelList.length > 0) {
          const defaultModel =
            modelList.find((m) => m.id === 'add_benchmark') || modelList[0];
          setSelectedModel(defaultModel);
        }
      } catch (err) {
        setError('Failed to connect to backend. Make sure the server is running.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Initialize fixed params when model changes
  // Preserve user's parameter settings (mode, start, end, numPoints, scale) across model changes
  useEffect(() => {
    if (selectedModel) {
      const defaults: Record<string, number | string | boolean> = {};
      selectedModel.parameters.forEach((p) => {
        defaults[p.name] = p.default;
      });
      setFixedParams(defaults);

      // Get sweepable parameters for the new model
      const sweepable = selectedModel.parameters.filter((p) => p.sweepable);
      
      // For X-axis: try to find a matching parameter by name, otherwise use first sweepable
      if (sweepable.length > 0) {
        const matchingParam = xAxisConfig.parameterName 
          ? sweepable.find(p => p.name === xAxisConfig.parameterName)
          : null;
        const targetParam = matchingParam || sweepable[0];
        
        setXAxisConfig((prev) => ({
          // Preserve user's settings
          mode: prev.mode,
          numPoints: prev.numPoints,
          scale: prev.scale,
          start: prev.start,
          end: prev.end,
          fixedValue: prev.fixedValue,
          // Update parameter name to match new model
          parameterName: targetParam.name,
        }));
      }
      
      // For Y-axis: try to find a matching parameter by name, otherwise use second sweepable
      if (sweepable.length > 1) {
        const matchingParam = yAxisConfig.parameterName 
          ? sweepable.find(p => p.name === yAxisConfig.parameterName)
          : null;
        // Avoid using the same parameter as X-axis
        const availableParams = sweepable.filter(p => p.name !== xAxisConfig.parameterName);
        const targetParam = matchingParam || availableParams[0] || sweepable[1];
        
        setYAxisConfig((prev) => ({
          // Preserve user's settings
          mode: prev.mode,
          numPoints: prev.numPoints,
          scale: prev.scale,
          start: prev.start,
          end: prev.end,
          fixedValue: prev.fixedValue,
          // Update parameter name to match new model
          parameterName: targetParam.name,
        }));
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
              values: xAxisConfig.mode === 'range'
                ? {
                    start: xAxisConfig.start,
                    end: xAxisConfig.end,
                    num_points: xAxisConfig.numPoints,
                    scale: xAxisConfig.scale,
                  } as ParameterRange
                : xAxisConfig.fixedValue, // Fixed value as single number
            }
          : null;

        // Y-axis: either range or fixed value
        const yAxis: SweepParameter | null = yAxisConfig.parameterName
          ? {
              name: yAxisConfig.parameterName,
              values: yAxisConfig.mode === 'range'
                ? {
                    start: yAxisConfig.start,
                    end: yAxisConfig.end,
                    num_points: yAxisConfig.numPoints,
                    scale: yAxisConfig.scale,
                  } as ParameterRange
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
          iterations: Number(fixedParams.iterations) || 10,
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
          iterations: Number(fixedParams.iterations) || 10,
          parameters: fixedParams,
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
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tt-purple to-tt-purple-dark flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Tenstorrent Simulator Playground
                </h1>
                <p className="text-sm text-gray-400">
                  Explore AI models on simulated Wormhole hardware
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  simulatorAvailable ? 'bg-green-400' : 'bg-red-400'
                }`}
              ></span>
              <span className="text-sm text-gray-400">
                {simulatorAvailable ? 'Simulator Ready' : 'Simulator Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

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
                  disabled={isRunning || !simulatorAvailable}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isRunning || !simulatorAvailable
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
                        excludeParameters={yAxisConfig.parameterName ? [yAxisConfig.parameterName] : []}
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
                        excludeParameters={xAxisConfig.parameterName ? [xAxisConfig.parameterName] : []}
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

                {/* Row 3: Iterations - Full Width */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Iterations</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={Number(fixedParams.iterations ?? 10)}
                      onChange={(e) => setFixedParams(prev => ({
                        ...prev,
                        iterations: Number(e.target.value)
                      }))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tt-purple"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={Number(fixedParams.iterations ?? 10)}
                      onChange={(e) => setFixedParams(prev => ({
                        ...prev,
                        iterations: Number(e.target.value)
                      }))}
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

          {/* Sweep Results - Dual Chart View */}
          {sweepResult && sweepResult.status === 'completed' && sweepResult.data_points.length > 0 && (
            <DualChartView result={sweepResult} />
          )}

          {/* Single Simulation Status */}
          {!sweepResult && (
            <SimulationStatusDisplay job={currentJob} isRunning={isRunning} />
          )}

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
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-gray-800 bg-gray-900 py-2">
        <p className="text-center text-xs text-gray-500">
          Powered by{' '}
          <a
            href="https://github.com/tenstorrent/ttsim"
            target="_blank"
            rel="noopener noreferrer"
            className="text-tt-purple-light hover:text-tt-purple"
          >
            ttsim
          </a>{' '}
          and{' '}
          <a
            href="https://github.com/tenstorrent/tt-metal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-tt-purple-light hover:text-tt-purple"
          >
            tt-metal
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
