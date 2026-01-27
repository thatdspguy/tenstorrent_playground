import { useMemo } from 'react';

export interface MLPConfig {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  batchSize: number;
}

interface MLPVisualizationProps {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  batchSize: number;
  onConfigChange?: (config: MLPConfig) => void;
}

export function MLPVisualization({
  inputSize,
  hiddenSize,
  outputSize,
  batchSize,
  onConfigChange,
}: MLPVisualizationProps) {
  // Calculate parameters
  const totalParams = useMemo(() => {
    const layer1Weights = inputSize * hiddenSize;
    const layer1Bias = hiddenSize;
    const layer2Weights = hiddenSize * outputSize;
    const layer2Bias = outputSize;
    return layer1Weights + layer1Bias + layer2Weights + layer2Bias;
  }, [inputSize, hiddenSize, outputSize]);

  // Generate node positions for visualization
  const layers = [
    { name: 'Input', size: inputSize, nodes: Math.min(inputSize, 8) },
    { name: 'Hidden', size: hiddenSize, nodes: Math.min(hiddenSize, 8), activation: 'ReLU' },
    { name: 'Output', size: outputSize, nodes: Math.min(outputSize, 8) },
  ];

  const handleChange = (key: string, value: number) => {
    if (onConfigChange) {
      onConfigChange({
        inputSize,
        hiddenSize,
        outputSize,
        batchSize,
        [key]: value,
      });
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Network Architecture</h3>
      
      {/* Network Visualization */}
      <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
        <svg viewBox="0 0 400 200" className="w-full h-40">
          {/* Draw connections first (behind nodes) */}
          {layers.slice(0, -1).map((layer, layerIdx) => {
            const nextLayer = layers[layerIdx + 1];
            const x1 = 60 + layerIdx * 140;
            const x2 = 60 + (layerIdx + 1) * 140;
            
            return layer.nodes > 0 && nextLayer.nodes > 0 ? (
              <g key={`connections-${layerIdx}`}>
                {Array.from({ length: Math.min(layer.nodes, 4) }).map((_, i) => {
                  const y1 = 100 - ((layer.nodes - 1) / 2 - i) * 20;
                  return Array.from({ length: Math.min(nextLayer.nodes, 4) }).map((_, j) => {
                    const y2 = 100 - ((nextLayer.nodes - 1) / 2 - j) * 20;
                    return (
                      <line
                        key={`${layerIdx}-${i}-${j}`}
                        x1={x1 + 12}
                        y1={y1}
                        x2={x2 - 12}
                        y2={y2}
                        stroke="rgb(124, 58, 237)"
                        strokeWidth="1"
                        opacity="0.2"
                      />
                    );
                  });
                })}
              </g>
            ) : null;
          })}

          {/* Draw nodes */}
          {layers.map((layer, layerIdx) => {
            const x = 60 + layerIdx * 140;
            const displayNodes = Math.min(layer.nodes, 6);
            const hasMore = layer.size > displayNodes;
            
            return (
              <g key={`layer-${layerIdx}`}>
                {/* Layer label */}
                <text
                  x={x}
                  y={25}
                  textAnchor="middle"
                  className="fill-gray-400 text-[10px]"
                >
                  {layer.name}
                </text>
                <text
                  x={x}
                  y={38}
                  textAnchor="middle"
                  className="fill-tt-purple-light text-[9px]"
                >
                  {layer.size}
                </text>
                
                {/* Nodes */}
                {Array.from({ length: displayNodes }).map((_, i) => {
                  const y = 100 - ((displayNodes - 1) / 2 - i) * 20;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={10}
                      fill="rgb(124, 58, 237)"
                      fillOpacity={0.3 + (i / displayNodes) * 0.4}
                      stroke="rgb(124, 58, 237)"
                      strokeWidth="1.5"
                    />
                  );
                })}
                
                {/* "..." indicator if more nodes */}
                {hasMore && (
                  <text
                    x={x}
                    y={100 + (displayNodes / 2) * 20 + 15}
                    textAnchor="middle"
                    className="fill-gray-500 text-[10px]"
                  >
                    ...
                  </text>
                )}
                
                {/* Activation label */}
                {layer.activation && (
                  <text
                    x={x}
                    y={180}
                    textAnchor="middle"
                    className="fill-green-400 text-[9px]"
                  >
                    {layer.activation}
                  </text>
                )}
              </g>
            );
          })}

          {/* Layer operation labels */}
          <text x={130} y={170} textAnchor="middle" className="fill-gray-500 text-[8px]">
            Linear
          </text>
          <text x={270} y={170} textAnchor="middle" className="fill-gray-500 text-[8px]">
            Linear
          </text>
        </svg>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Input Size</label>
          <select
            value={inputSize}
            onChange={(e) => handleChange('inputSize', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-tt-purple"
          >
            <option value={32}>32</option>
            <option value={64}>64</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Hidden Size</label>
          <select
            value={hiddenSize}
            onChange={(e) => handleChange('hiddenSize', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-tt-purple"
          >
            <option value={32}>32</option>
            <option value={64}>64</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Output Size</label>
          <select
            value={outputSize}
            onChange={(e) => handleChange('outputSize', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-tt-purple"
          >
            <option value={16}>16</option>
            <option value={32}>32</option>
            <option value={64}>64</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Batch Size</label>
          <select
            value={batchSize}
            onChange={(e) => handleChange('batchSize', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-tt-purple"
          >
            <option value={16}>16</option>
            <option value={32}>32</option>
            <option value={64}>64</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-500">
        <span>Total Parameters: {totalParams.toLocaleString()}</span>
        <span>Batch: {batchSize} samples</span>
      </div>
    </div>
  );
}

export default MLPVisualization;
