import { useMemo } from 'react';

interface ModelStatisticsProps {
  totalInferences?: number;
  inferenceHistory?: number[]; // Array of latency values
}

export function ModelStatistics({ 
  totalInferences = 0,
  inferenceHistory = []
}: ModelStatisticsProps) {
  // Calculate average latency from history
  const averageLatency = useMemo(() => {
    if (inferenceHistory.length === 0) return null;
    const sum = inferenceHistory.reduce((a, b) => a + b, 0);
    return sum / inferenceHistory.length;
  }, [inferenceHistory]);

  // Calculate average throughput from average latency
  const averageThroughput = useMemo(() => {
    if (averageLatency === null || averageLatency === 0) return null;
    return 1000 / averageLatency;
  }, [averageLatency]);

  const stats = [
    { 
      label: 'Average Latency', 
      value: averageLatency !== null ? averageLatency.toFixed(2) : '--', 
      unit: 'ms',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-blue-400',
      subtitle: totalInferences > 0 ? `over ${totalInferences} inference${totalInferences !== 1 ? 's' : ''}` : undefined
    },
    { 
      label: 'Average Throughput', 
      value: averageThroughput !== null ? averageThroughput.toFixed(0) : '--', 
      unit: 'inf/s',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-yellow-400',
      subtitle: totalInferences > 0 ? `over ${totalInferences} inference${totalInferences !== 1 ? 's' : ''}` : undefined
    },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Performance Statistics</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className="bg-gray-900/50 rounded-lg p-3 border border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={stat.color}>{stat.icon}</span>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
            <p className="text-xl font-semibold text-white">
              {stat.value}
              <span className="text-xs text-gray-500 ml-1">{stat.unit}</span>
            </p>
            {stat.subtitle && (
              <p className="text-[10px] text-gray-500 mt-0.5">{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
