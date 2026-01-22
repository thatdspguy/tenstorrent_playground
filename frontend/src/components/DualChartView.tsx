import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    type ChartOptions,
} from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { SweepSimulationResult } from '../api/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DualChartViewProps {
  result: SweepSimulationResult;
}

const COLORS = [
  '#7c3aed', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
];

export function DualChartView({ result }: DualChartViewProps) {
  const { chartData: latencyData, yAxisLabel: latencyLabel } = useMemo(() => {
    return buildChartData(result, 'latency_ms', 'Latency (ms)');
  }, [result]);

  const { chartData: throughputData, yAxisLabel: throughputLabel } = useMemo(() => {
    return buildChartData(result, 'throughput_inferences_per_sec', 'Throughput (ops/sec)');
  }, [result]);

  const latencyOptions = useMemo(() => 
    buildChartOptions('Latency Analysis', latencyLabel, result.x_axis_name),
    [latencyLabel, result.x_axis_name]
  );

  const throughputOptions = useMemo(() => 
    buildChartOptions('Throughput Analysis', throughputLabel, result.x_axis_name),
    [throughputLabel, result.x_axis_name]
  );

  const is2D = result.sweep_type === '2d' && result.y_axis_name;

  return (
    <div className="space-y-4">
      {/* Chart Legend for 2D sweeps */}
      {is2D && result.y_axis_values && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">
            <span className="font-medium">X-Axis:</span> {formatParamName(result.x_axis_name)}
            <span className="mx-3">|</span>
            <span className="font-medium">Series:</span> {formatParamName(result.y_axis_name || '')} values
          </p>
          <div className="flex flex-wrap gap-3">
            {result.y_axis_values.map((val, idx) => (
              <div key={val} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-xs text-gray-300">
                  {formatParamName(result.y_axis_name || '')} = {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Chart */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="h-[300px]">
            <Line options={latencyOptions} data={latencyData} />
          </div>
        </div>

        {/* Throughput Chart */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="h-[300px]">
            <Line options={throughputOptions} data={throughputData} />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Summary Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Min Latency"
            value={`${Math.min(...result.data_points.map(d => d.latency_ms)).toFixed(2)} ms`}
          />
          <StatCard
            label="Max Latency"
            value={`${Math.max(...result.data_points.map(d => d.latency_ms)).toFixed(2)} ms`}
          />
          <StatCard
            label="Max Throughput"
            value={`${Math.max(...result.data_points.map(d => d.throughput_inferences_per_sec)).toFixed(1)} ops/s`}
          />
          <StatCard
            label="Data Points"
            value={result.data_points.length.toString()}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatParamName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildChartData(
  result: SweepSimulationResult,
  metric: 'latency_ms' | 'throughput_inferences_per_sec',
  _label: string
) {
  const is2D = result.sweep_type === '2d' && result.y_axis_name && result.y_axis_values;

  if (is2D && result.y_axis_values) {
    // 2D sweep: multiple lines, one per y_axis value
    const datasets = result.y_axis_values.map((yVal, idx) => {
      const filteredData = result.data_points.filter(
        d => d.parameter_values[result.y_axis_name!] === yVal
      );
      
      return {
        label: `${formatParamName(result.y_axis_name!)} = ${yVal}`,
        data: filteredData.map(d => d[metric]),
        borderColor: COLORS[idx % COLORS.length],
        backgroundColor: COLORS[idx % COLORS.length] + '20',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    return {
      chartData: {
        labels: result.x_axis_values.map(v => v.toString()),
        datasets,
      },
      yAxisLabel: metric === 'latency_ms' ? 'Latency (ms)' : 'Throughput (ops/sec)',
    };
  } else {
    // 1D sweep: single line
    return {
      chartData: {
        labels: result.x_axis_values.map(v => v.toString()),
        datasets: [{
          label: metric === 'latency_ms' ? 'Latency' : 'Throughput',
          data: result.data_points.map(d => d[metric]),
          borderColor: COLORS[0],
          backgroundColor: COLORS[0] + '20',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        }],
      },
      yAxisLabel: metric === 'latency_ms' ? 'Latency (ms)' : 'Throughput (ops/sec)',
    };
  }
}

function buildChartOptions(
  title: string,
  yAxisLabel: string,
  xAxisName: string
): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { size: 11 },
        },
      },
      title: {
        display: true,
        text: title,
        color: '#e5e7eb',
        font: { size: 14, weight: 'bold' },
        padding: { bottom: 10 },
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: formatParamName(xAxisName),
          color: '#9ca3af',
          font: { size: 12 },
        },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel,
          color: '#9ca3af',
          font: { size: 12 },
        },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };
}

export default DualChartView;
