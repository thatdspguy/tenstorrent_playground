import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { SimulationResult } from '../api/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ResultsChartProps {
  result: SimulationResult;
}

export function ResultsChart({ result }: ResultsChartProps) {
  const { metrics, comparison } = result;

  // Latency comparison chart
  const latencyData = {
    labels: ['Simulated', 'Expected Silicon'],
    datasets: [
      {
        label: 'Latency (ms)',
        data: [
          metrics.latency_ms,
          comparison.expected_silicon.latency_ms,
        ],
        backgroundColor: ['rgba(124, 58, 237, 0.8)', 'rgba(16, 185, 129, 0.8)'],
        borderColor: ['rgb(124, 58, 237)', 'rgb(16, 185, 129)'],
        borderWidth: 1,
      },
    ],
  };

  // Throughput comparison chart
  const throughputData = {
    labels: ['Simulated', 'Expected Silicon'],
    datasets: [
      {
        label: 'Throughput (inferences/sec)',
        data: [
          metrics.throughput_inferences_per_sec,
          comparison.expected_silicon.throughput_inferences_per_sec,
        ],
        backgroundColor: ['rgba(124, 58, 237, 0.8)', 'rgba(16, 185, 129, 0.8)'],
        borderColor: ['rgb(124, 58, 237)', 'rgb(16, 185, 129)'],
        borderWidth: 1,
      },
    ],
  };

  // Speedup doughnut
  const speedupData = {
    labels: ['Simulator Time', 'Silicon Speedup'],
    datasets: [
      {
        data: [1, comparison.speedup_factor - 1],
        backgroundColor: ['rgba(124, 58, 237, 0.8)', 'rgba(16, 185, 129, 0.8)'],
        borderColor: ['rgb(124, 58, 237)', 'rgb(16, 185, 129)'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    cutout: '70%',
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Performance Results</h3>

      {/* Metrics summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Latency"
          value={`${metrics.latency_ms.toFixed(2)} ms`}
          subtext="per inference"
        />
        <MetricCard
          label="Throughput"
          value={`${metrics.throughput_inferences_per_sec.toFixed(0)}`}
          subtext="inferences/sec"
        />
        <MetricCard
          label="Speedup"
          value={`${comparison.speedup_factor}×`}
          subtext="expected vs silicon"
          highlight
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Latency Comparison
          </h4>
          <div className="h-48">
            <Bar data={latencyData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Throughput Comparison
          </h4>
          <div className="h-48">
            <Bar data={throughputData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Expected Silicon Speedup
          </h4>
          <div className="h-48 flex items-center justify-center relative">
            <Doughnut data={speedupData} options={doughnutOptions} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {comparison.speedup_factor}×
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Output verification */}
      {result.output_sample && result.output_sample.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Output Verification
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            First 2 values from the output tensor (proof the simulation ran on ttsim):
          </p>
          <code className="text-sm text-tt-purple-light font-mono bg-gray-900 px-3 py-2 rounded block">
            result[0:2] = [{result.output_sample.map((v) => v.toFixed(4)).join(', ')}]
          </code>
          {result.model_id === 'add_benchmark' && (
            <p className="text-xs text-green-400 mt-2">✓ Expected: 3.0 (1.0 + 2.0)</p>
          )}
          {result.model_id === 'multiply_benchmark' && (
            <p className="text-xs text-green-400 mt-2">✓ Expected: 6.0 (2.0 × 3.0)</p>
          )}
          {result.model_id === 'exp_benchmark' && (
            <p className="text-xs text-green-400 mt-2">✓ Expected: ~2.718 (e¹)</p>
          )}
          {result.model_id === 'relu_benchmark' && (
            <p className="text-xs text-gray-400 mt-2">Random input → ReLU (negatives become 0)</p>
          )}
          {result.model_id === 'chain_benchmark' && (
            <p className="text-xs text-gray-400 mt-2">Random input → Add 0.5 → ReLU → Multiply by 2</p>
          )}
          {result.model_id === 'sigmoid_benchmark' && (
            <p className="text-xs text-green-400 mt-2">✓ Expected: 0.5 (sigmoid(0) = 0.5)</p>
          )}
          {result.model_id === 'gelu_benchmark' && (
            <p className="text-xs text-green-400 mt-2">✓ Expected: ~0.841 (GELU(1))</p>
          )}
          {result.model_id === 'tanh_benchmark' && (
            <p className="text-xs text-green-400 mt-2">✓ Expected: 0.0 (tanh(0) = 0)</p>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string;
  value: string;
  subtext: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        highlight
          ? 'bg-gradient-to-br from-tt-purple/20 to-green-500/20 border border-tt-purple/30'
          : 'bg-gray-800'
      }`}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-bold ${
          highlight ? 'text-green-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  );
}

export default ResultsChart;
