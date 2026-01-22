import { useState, useEffect } from 'react';
import { apiClient } from './api';
import type { ModelInfo, SimulationJob } from './api/types';
import {
  ModelSelector,
  ParameterConfig,
  ResultsChart,
  SimulationStatusDisplay,
} from './components';

function App() {
  // State
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [parameters, setParameters] = useState<
    Record<string, number | string | boolean>
  >({});
  const [iterations, setIterations] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<SimulationJob | null>(null);
  const [simulatorAvailable, setSimulatorAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          // Select the add_benchmark by default as it's most reliable
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

  // Run simulation
  const handleRunSimulation = async () => {
    if (!selectedModel) return;

    setIsRunning(true);
    setCurrentJob(null);
    setError(null);

    try {
      const job = await apiClient.runSimulation({
        model_id: selectedModel.id,
        iterations,
        parameters,
      });
      setCurrentJob(job);
    } catch (err) {
      setError('Simulation failed. Check console for details.');
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
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
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Model selection and parameters */}
          <div className="lg:col-span-1 space-y-6">
            {/* Model selector */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                loading={isLoading}
              />
            </div>

            {/* Parameters */}
            {selectedModel && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <ParameterConfig
                  model={selectedModel}
                  values={parameters}
                  onChange={setParameters}
                />

                {/* Iterations slider */}
                <div className="mt-6 space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Iterations
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={iterations}
                      onChange={(e) => setIterations(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-tt-purple"
                    />
                    <span className="w-12 text-center text-white">
                      {iterations}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Number of times to run the model for timing
                  </p>
                </div>

                {/* Run button */}
                <button
                  onClick={handleRunSimulation}
                  disabled={isRunning || !simulatorAvailable}
                  className={`mt-6 w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                    isRunning || !simulatorAvailable
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-tt-purple hover:bg-tt-purple-dark text-white shadow-lg shadow-tt-purple/25 hover:shadow-tt-purple/40'
                  }`}
                >
                  {isRunning ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Running Simulation...
                    </span>
                  ) : (
                    'Run Simulation'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right column: Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status */}
            <SimulationStatusDisplay job={currentJob} isRunning={isRunning} />

            {/* Results chart */}
            {currentJob?.status === 'completed' && currentJob.result && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <ResultsChart result={currentJob.result} />
              </div>
            )}

            {/* Empty state */}
            {!currentJob && !isRunning && (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-500"
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
                <h3 className="text-lg font-medium text-white mb-2">
                  Ready to Simulate
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Select a model, configure parameters, and click "Run
                  Simulation" to see performance metrics on simulated Tenstorrent
                  hardware.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
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
        </div>
      </footer>
    </div>
  );
}

export default App;
