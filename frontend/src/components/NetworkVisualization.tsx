import { useMemo, useState } from 'react';
import type { DigitRecognitionResult, ModelArchitectureInfo } from '../api/types';

interface NetworkVisualizationProps {
  modelInfo: ModelArchitectureInfo | null;
  result?: DigitRecognitionResult | null;
  isLoading?: boolean;
  inputImageData?: number[]; // 784 pixel values (28x28) normalized 0-1
}

// Unified layer type for visualization
interface VisualizationLayer {
  name: string;
  size: number;
  type: string;
  neurons?: number;
  blocks?: number;
  activation?: string;
}

export function NetworkVisualization({ 
  modelInfo, 
  result, 
  isLoading = false,
  inputImageData 
}: NetworkVisualizationProps) {
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);

  // Process layer activations for visualization (always show when available)
  const layerActivations = useMemo(() => {
    if (!result?.layer_activations) return null;
    return result.layer_activations;
  }, [result?.layer_activations]);

  // Layer configuration for visualization
  const layers: VisualizationLayer[] = useMemo(() => {
    if (!modelInfo) {
      // Default visualization without model info
      return [
        { name: 'Input', size: 784, type: 'input', neurons: 28 },
        { name: 'Layer 1', size: 64, type: 'blocked', blocks: 13 },
        { name: 'Layer 2', size: 64, type: 'dense', activation: 'ReLU' },
        { name: 'Layer 3', size: 64, type: 'dense', activation: 'ReLU' },
        { name: 'Output', size: 10, type: 'output' },
      ];
    }

    return [
      { name: 'Input', size: modelInfo.input_size, type: 'input', neurons: 28 },
      ...modelInfo.architecture.map((layer) => ({
        name: `Layer ${layer.layer}`,
        size: layer.out,
        type: layer.type.includes('Blocked') ? 'blocked' : 'dense',
        blocks: layer.blocks,
        activation: layer.type.includes('ReLU') ? 'ReLU' : undefined,
      })),
    ];
  }, [modelInfo]);

  // Render 28x28 input image grid
  const renderInputImageGrid = () => {
    if (!inputImageData || inputImageData.length !== 784) {
      // Fallback to placeholder grid
      return (
        <div className="flex flex-col items-center gap-1">
          <div 
            className="grid gap-px bg-gray-900 p-0.5 rounded"
            style={{ gridTemplateColumns: 'repeat(28, 1fr)' }}
          >
            {Array.from({ length: 784 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-gray-800"
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <div 
          className="grid gap-0 bg-black p-0.5 rounded"
          style={{ gridTemplateColumns: 'repeat(28, 1fr)' }}
        >
          {inputImageData.map((pixel, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 transition-all duration-300"
              style={{ backgroundColor: `rgb(${Math.round(pixel * 255)}, ${Math.round(pixel * 255)}, ${Math.round(pixel * 255)})` }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render output layer as vertical column with digit labels (0-9)
  const renderOutputColumn = (confidences?: number[], predictedDigit?: number) => {
    return (
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 10 }).map((_, digit) => {
          const conf = confidences?.[digit] ?? 0;
          const intensity = 0.2 + (conf * 0.8);
          const isPredicted = predictedDigit === digit;
          
          return (
            <div key={digit} className="flex items-center gap-1.5">
              <div
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${isPredicted ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-gray-900' : ''}
                `}
                style={{ backgroundColor: `rgba(124, 58, 237, ${intensity})` }}
              />
              <span className={`text-[10px] font-mono ${isPredicted ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                {digit}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render neuron grid (with output layer confidence brightness)
  const renderNeuronGrid = (count: number, maxDisplay: number = 64, activations?: number[], _layerIdx?: number, isOutput?: boolean, confidences?: number[]) => {
    const displayCount = Math.min(count, maxDisplay);
    const cols = Math.ceil(Math.sqrt(displayCount));
    const hasMore = count > maxDisplay;

    return (
      <div className="flex flex-col items-center gap-1">
        <div 
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.min(cols, 8)}, 1fr)` }}
        >
          {Array.from({ length: displayCount }).map((_, i) => {
            let intensity = 0.3;
            
            // For output layer, use confidence values directly
            if (isOutput && confidences) {
              const conf = confidences[i] ?? 0;
              intensity = 0.2 + (conf * 0.8); // Scale from 0.2 to 1.0 based on confidence
            } else if (activations && layerActivations) {
              // Normalize activation for display
              const act = activations[i] ?? 0;
              intensity = Math.min(1, Math.max(0, (act + 2) / 4)); // Assume activations roughly in [-2, 2]
            }
            
            return (
              <div
                key={i}
                className={`
                  w-2.5 h-2.5 rounded-sm transition-all duration-300
                  ${layerActivations || (isOutput && confidences)
                    ? '' 
                    : 'bg-tt-purple/40'
                  }
                `}
                style={
                  layerActivations || (isOutput && confidences)
                    ? { backgroundColor: `rgba(124, 58, 237, ${intensity})` }
                    : undefined
                }
              />
            );
          })}
        </div>
        {hasMore && (
          <span className="text-[10px] text-gray-500">+{count - maxDisplay} more</span>
        )}
      </div>
    );
  };

  // Render connections between layers (compact)
  const renderConnections = (fromLayer: number, toLayer: number) => {
    return (
      <div className="flex items-center justify-center w-8 flex-shrink-0">
        <svg className="w-full h-10" viewBox="0 0 30 30">
          {/* Simple arrow */}
          <defs>
            <linearGradient id={`grad-${fromLayer}-${toLayer}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(124, 58, 237)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(124, 58, 237)" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <line x1="0" y1="15" x2="22" y2="15" stroke={`url(#grad-${fromLayer}-${toLayer})`} strokeWidth="2" />
          <polygon points="28,15 20,11 20,19" fill="rgb(124, 58, 237)" className="opacity-70" />
        </svg>
      </div>
    );
  };

  if (isLoading && !modelInfo) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Network Architecture</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-tt-purple border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Network Architecture</h2>
      </div>

      {/* Network Visualization */}
      <div className="flex-1 flex flex-col">
        {/* Architecture Overview */}
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-4">
          {layers.map((layer, idx) => {
            const isOutput = idx === layers.length - 1;
            return (
              <div key={idx} className="flex items-center">
                {/* Layer Box */}
                <div
                  className={`
                    flex flex-col items-center p-4 rounded-lg border transition-all cursor-pointer min-w-[90px]
                    ${selectedLayer === idx
                      ? 'bg-tt-purple/20 border-tt-purple/50 shadow-lg shadow-tt-purple/20'
                      : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                    }
                  `}
                  onClick={() => setSelectedLayer(selectedLayer === idx ? null : idx)}
                >
                  <span className="text-xs text-gray-400 mb-1">{layer.name}</span>
                  {idx === 0 ? renderInputImageGrid() : isOutput ? renderOutputColumn(
                    result?.all_confidences,
                    result?.predicted_digit
                  ) : renderNeuronGrid(
                    Math.min(layer.size, 64), 
                    64, 
                    layerActivations?.[idx - 1], // idx-1 because input has no activations
                    idx,
                    false,
                    undefined
                  )}
                  <span className="text-xs text-tt-purple-light mt-1">{layer.size}</span>
                  {layer.type === 'blocked' && (
                    <span className="text-[10px] text-gray-500">{layer.blocks} blocks</span>
                  )}
                  {layer.activation && (
                    <span className="text-[10px] text-green-400">{layer.activation}</span>
                  )}
                </div>
                
                {/* Connection to next layer */}
                {idx < layers.length - 1 && renderConnections(idx, idx + 1)}
              </div>
            );
          })}
        </div>

        {/* Layer Details (when selected) */}
        {selectedLayer !== null && (
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-sm font-medium text-white mb-2">
              {layers[selectedLayer].name} Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400">Size:</span>
                <span className="text-white ml-2">{layers[selectedLayer].size} neurons</span>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="text-white ml-2">{layers[selectedLayer].type}</span>
              </div>
              {layers[selectedLayer].blocks && (
                <div>
                  <span className="text-gray-400">Blocks:</span>
                  <span className="text-white ml-2">{layers[selectedLayer].blocks} × 64×64</span>
                </div>
              )}
              {layers[selectedLayer].activation && (
                <div>
                  <span className="text-gray-400">Activation:</span>
                  <span className="text-green-400 ml-2">{layers[selectedLayer].activation}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Model Info Footer */}
        {modelInfo && (
          <div className="mt-auto pt-4 border-t border-gray-700">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{modelInfo.name}</span>
              <span>{modelInfo.total_parameters.toLocaleString()} parameters</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
