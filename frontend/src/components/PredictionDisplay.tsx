import { useMemo } from 'react';
import type { DigitRecognitionResult } from '../api/types';

interface PredictionDisplayProps {
  result: DigitRecognitionResult | null;
  isLoading?: boolean;
}

export function PredictionDisplay({ result, isLoading = false }: PredictionDisplayProps) {
  // Find the top 3 predictions
  const topPredictions = useMemo(() => {
    if (!result?.all_confidences) return [];
    
    return result.all_confidences
      .map((conf, digit) => ({ digit, confidence: conf }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }, [result?.all_confidences]);

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Prediction</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-tt-purple border-t-transparent mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Running inference...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Prediction</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-900 border border-gray-600 rounded-lg flex items-center justify-center">
            <span className="text-4xl font-bold text-gray-600">?</span>
          </div>
          <div className="flex-1">
            <p className="text-gray-400 text-sm mb-2">Draw a digit and click "Run Inference"</p>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <div
                  key={digit}
                  className="text-center p-1.5 bg-gray-900/50 rounded border border-gray-700"
                >
                  <div className="text-xs text-gray-500 font-medium">{digit}</div>
                  <div className="text-xs text-gray-600">--%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="bg-gray-800/50 border border-red-700/50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Prediction</h2>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300 text-sm">
            <span className="font-medium">Error:</span> {result.error || 'Inference failed'}
          </p>
        </div>
      </div>
    );
  }

  const confidence = result.confidence * 100;
  const confidenceColor = 
    confidence >= 80 ? 'text-green-400' :
    confidence >= 50 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Prediction</h2>
      
      <div className="flex items-start gap-6">
        {/* Main Prediction */}
        <div className="flex flex-col items-center">
          <div 
            className={`
              w-24 h-24 rounded-lg flex items-center justify-center
              bg-gradient-to-br from-tt-purple/20 to-indigo-600/20
              border-2 border-tt-purple/50 shadow-lg shadow-tt-purple/20
            `}
          >
            <span className="text-5xl font-bold text-white">{result.predicted_digit}</span>
          </div>
          <div className={`mt-2 text-lg font-semibold ${confidenceColor}`}>
            {confidence.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">confidence</div>
        </div>

        {/* All Confidences */}
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-2">All digit probabilities:</p>
          <div className="grid grid-cols-5 gap-2">
            {result.all_confidences.map((conf, digit) => {
              const isTop = digit === result.predicted_digit;
              const pct = conf * 100;
              return (
                <div
                  key={digit}
                  className={`
                    text-center p-1.5 rounded border transition-all
                    ${isTop 
                      ? 'bg-tt-purple/20 border-tt-purple/50 shadow-sm shadow-tt-purple/20' 
                      : 'bg-gray-900/50 border-gray-700'
                    }
                  `}
                >
                  <div className={`text-xs font-medium ${isTop ? 'text-tt-purple-light' : 'text-gray-400'}`}>
                    {digit}
                  </div>
                  <div className={`text-xs ${isTop ? 'text-white font-semibold' : 'text-gray-500'}`}>
                    {pct < 0.1 ? '<0.1' : pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top 3 Bar Chart */}
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Top predictions:</p>
            <div className="space-y-2">
              {topPredictions.map(({ digit, confidence: conf }, idx) => (
                <div key={digit} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{digit}</span>
                  <div className="flex-1 h-4 bg-gray-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 
                          ? 'bg-gradient-to-r from-tt-purple to-indigo-500' 
                          : idx === 1 
                            ? 'bg-gray-600' 
                            : 'bg-gray-700'
                      }`}
                      style={{ width: `${conf * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {(conf * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
