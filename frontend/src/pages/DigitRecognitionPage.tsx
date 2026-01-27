import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api';
import type { DigitRecognitionResult, ModelArchitectureInfo, SimulatorAvailability } from '../api/types';
import type { ChipType } from '../components';
import { DigitCanvas } from '../components/DigitCanvas';
import { ModelStatistics } from '../components/ModelStatistics';
import { NetworkVisualization } from '../components/NetworkVisualization';
import { PredictionDisplay } from '../components/PredictionDisplay';

interface DigitRecognitionPageProps {
  simulators: SimulatorAvailability[];
  selectedChip: ChipType;
  onSelectChip: (chip: ChipType) => void;
}

export function DigitRecognitionPage({
  simulators,
  selectedChip,
  onSelectChip,
}: DigitRecognitionPageProps) {
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DigitRecognitionResult | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelArchitectureInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Session statistics
  const [totalInferences, setTotalInferences] = useState(0);
  const [inferenceHistory, setInferenceHistory] = useState<number[]>([]);

  // Find the selected simulator's availability
  const selectedSimulator = simulators.find((s) => s.chip === selectedChip);
  const isAvailable = selectedSimulator?.available ?? false;

  // Load model info on mount
  useEffect(() => {
    async function loadModelInfo() {
      try {
        const info = await apiClient.getDigitRecognitionModelInfo();
        setModelInfo(info);
      } catch (err) {
        console.error('Failed to load model info:', err);
      }
    }
    loadModelInfo();
  }, []);

  // Reset statistics when chip type changes
  useEffect(() => {
    setTotalInferences(0);
    setInferenceHistory([]);
    setResult(null);
  }, [selectedChip]);

  // Handle image capture and run inference
  const handleImageCapture = useCallback(async (imageData: string) => {
    setIsRunning(true);
    setError(null);

    try {
      const response = await apiClient.recognizeDigit({
        image_data: imageData,
        chip: selectedChip,
      });
      
      setResult(response);
      setTotalInferences(prev => prev + 1);
      if (response.latency_ms > 0) {
        setInferenceHistory(prev => [...prev, response.latency_ms]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Inference failed';
      setError(errorMessage);
      setResult({
        predicted_digit: -1,
        confidence: 0,
        all_confidences: Array(10).fill(0),
        latency_ms: 0,
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsRunning(false);
    }
  }, [selectedChip]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Digit Recognition</h1>
            <p className="text-gray-400 text-sm mt-1">
              Draw a digit and run it through a neural network on ttsim
            </p>
          </div>

          {/* Chip Selector */}
          <div className="flex items-center gap-3">
            {!isAvailable && (
              <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
                Simulator offline - using CPU fallback
              </span>
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              <select
                value={selectedChip}
                onChange={(e) => onSelectChip(e.target.value as ChipType)}
                disabled={isRunning}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-tt-purple disabled:opacity-50"
              >
                {simulators.map((sim) => (
                  <option key={sim.chip} value={sim.chip}>
                    {sim.chip.charAt(0).toUpperCase() + sim.chip.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Drawing and Prediction */}
          <div className="flex flex-col gap-6">
            {/* Drawing Canvas */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Draw a Digit</h2>
              <div className="flex justify-center">
                <DigitCanvas
                  onImageCapture={handleImageCapture}
                  disabled={isRunning}
                  size={280}
                />
              </div>
            </div>

            {/* Prediction Results */}
            <PredictionDisplay result={result} isLoading={isRunning} />
          </div>

          {/* Right Column - Network Visualization & Stats */}
          <div className="flex flex-col gap-6">
            {/* Network Visualization - matches Draw a Digit height */}
            <NetworkVisualization
              modelInfo={modelInfo}
              result={result}
              isLoading={!modelInfo}
            />

            {/* Performance Statistics - matches Prediction height */}
            <ModelStatistics
              totalInferences={totalInferences}
              inferenceHistory={inferenceHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
