import { useEffect, useState } from 'react';
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
        iterations: Number(parameters.iterations) || 10,
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
      <main className="flex-1 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left column: Model selection and parameters */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-auto">
            {/* Model selector */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                loading={isLoading}
              />
            </div>

            {/* Parameters + Run button */}
            {selectedModel && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <ParameterConfig
                  model={selectedModel}
                  values={parameters}
                  onChange={setParameters}
                />

                {/* Run button */}
                <button
                  onClick={handleRunSimulation}
                  disabled={isRunning || !simulatorAvailable}
                  className={`mt-4 w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
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
          <div className="lg:col-span-9 flex flex-col gap-4 overflow-auto">
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
              <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center flex-1 flex flex-col items-center justify-center">
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
                <h3 className="text-base font-medium text-white mb-1">
                  Ready to Simulate
                </h3>
                <p className="text-gray-400 text-sm max-w-sm">
                  Select a model, configure parameters, and click "Run Simulation"
                </p>
              </div>
            )}
          </div>
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
