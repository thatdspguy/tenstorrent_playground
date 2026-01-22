import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import type Plotly from 'plotly.js';
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import Plot from 'react-plotly.js';
import type { SweepDataPoint, SweepSimulationResult } from '../api/types';

// Register Chart.js components for line charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type MetricType = 'latency' | 'throughput';
type ViewType = '3d' | 'heatmap';

interface SweepResultsChartProps {
  result: SweepSimulationResult;
}

/**
 * Format parameter name for display
 */
function formatParamName(name: string): string {
  return name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Get metric value from a data point
 */
function getMetricValue(point: SweepDataPoint, metric: MetricType): number {
  return metric === 'latency' ? point.latency_ms : point.throughput_inferences_per_sec;
}

/**
 * Line chart for 1D sweeps
 */
function LineChart1D({
  result,
  metric,
}: {
  result: SweepSimulationResult;
  metric: MetricType;
}) {
  const xLabel = formatParamName(result.x_axis_name);
  const yLabel = metric === 'latency' ? 'Latency (ms)' : 'Throughput (inferences/sec)';

  // Sort data points by x value
  const sortedPoints = useMemo(() => {
    return [...result.data_points].sort((a, b) => {
      const aX = a.parameter_values[result.x_axis_name] ?? 0;
      const bX = b.parameter_values[result.x_axis_name] ?? 0;
      return aX - bX;
    });
  }, [result.data_points, result.x_axis_name]);

  const data = {
    labels: sortedPoints.map(p => p.parameter_values[result.x_axis_name]),
    datasets: [
      {
        label: yLabel,
        data: sortedPoints.map(p => getMetricValue(p, metric)),
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#7c3aed',
        pointBorderColor: '#a78bfa',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(124, 58, 237, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (items: any[]) => `${xLabel}: ${items[0].label}`,
          label: (item: any) => {
            const value = item.raw;
            if (metric === 'latency') {
              return `Latency: ${value.toFixed(2)} ms`;
            }
            return `Throughput: ${value.toFixed(1)} inf/sec`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: xLabel,
          color: '#9ca3af',
        },
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
      },
      y: {
        title: {
          display: true,
          text: yLabel,
          color: '#9ca3af',
        },
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-[500px]">
      <Line data={data} options={options} />
    </div>
  );
}

/**
 * 3D Surface plot for 2D sweeps
 */
function Surface3D({
  result,
  metric,
}: {
  result: SweepSimulationResult;
  metric: MetricType;
}) {
  const xValues = [...result.x_axis_values].sort((a, b) => a - b);
  const yValues = result.y_axis_values ? [...result.y_axis_values].sort((a, b) => a - b) : [];

  // Create data map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, SweepDataPoint>();
    result.data_points.forEach(p => {
      const xVal = p.parameter_values[result.x_axis_name];
      const yVal = result.y_axis_name ? p.parameter_values[result.y_axis_name] : null;
      map.set(`${xVal}-${yVal}`, p);
    });
    return map;
  }, [result.data_points, result.x_axis_name, result.y_axis_name]);

  // Build z-matrix
  const z = yValues.map(yVal =>
    xValues.map(xVal => {
      const point = dataMap.get(`${xVal}-${yVal}`);
      return point ? getMetricValue(point, metric) : 0;
    })
  );

  const zLabel = metric === 'latency' ? 'Latency (ms)' : 'Throughput (inf/sec)';

  const data: Partial<Plotly.PlotData>[] = [
    {
      type: 'surface',
      x: xValues,
      y: yValues,
      z: z,
      colorscale: 'Viridis' as unknown as Plotly.ColorScale,
      opacity: 0.9,
      contours: {
        x: { show: true, usecolormap: true, highlightcolor: '#a78bfa' } as any,
        y: { show: true, usecolormap: true, highlightcolor: '#a78bfa' } as any,
        z: { show: true, usecolormap: true, highlightcolor: '#a78bfa' } as any,
      },
      hovertemplate: `${formatParamName(result.x_axis_name)}: %{x}<br>${formatParamName(result.y_axis_name || '')}: %{y}<br>${zLabel}: %{z:.2f}<extra></extra>`,
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    scene: {
      xaxis: {
        title: { text: formatParamName(result.x_axis_name), font: { color: '#9ca3af' } },
        gridcolor: '#374151',
        tickfont: { color: '#9ca3af' },
      },
      yaxis: {
        title: { text: formatParamName(result.y_axis_name || ''), font: { color: '#9ca3af' } },
        gridcolor: '#374151',
        tickfont: { color: '#9ca3af' },
      },
      zaxis: {
        title: { text: zLabel, font: { color: '#9ca3af' } },
        gridcolor: '#374151',
        tickfont: { color: '#9ca3af' },
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 },
      },
    },
    margin: { l: 0, r: 0, t: 30, b: 0 },
    font: { color: '#9ca3af' },
  };

  return (
    <div className="h-[500px]">
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

/**
 * Heatmap for 2D sweeps
 */
function Heatmap2D({
  result,
  metric,
}: {
  result: SweepSimulationResult;
  metric: MetricType;
}) {
  const xValues = [...result.x_axis_values].sort((a, b) => a - b);
  const yValues = result.y_axis_values ? [...result.y_axis_values].sort((a, b) => a - b) : [];

  // Create data map
  const dataMap = useMemo(() => {
    const map = new Map<string, SweepDataPoint>();
    result.data_points.forEach(p => {
      const xVal = p.parameter_values[result.x_axis_name];
      const yVal = result.y_axis_name ? p.parameter_values[result.y_axis_name] : null;
      map.set(`${xVal}-${yVal}`, p);
    });
    return map;
  }, [result.data_points, result.x_axis_name, result.y_axis_name]);

  // Build z-matrix
  const z = yValues.map(yVal =>
    xValues.map(xVal => {
      const point = dataMap.get(`${xVal}-${yVal}`);
      return point ? getMetricValue(point, metric) : 0;
    })
  );

  const zLabel = metric === 'latency' ? 'Latency (ms)' : 'Throughput (inf/sec)';

  const data: Partial<Plotly.PlotData>[] = [
    {
      type: 'heatmap',
      x: xValues.map(String),
      y: yValues.map(String),
      z: z,
      colorscale: 'Viridis' as unknown as Plotly.ColorScale,
      hoverongaps: false,
      hovertemplate: `${formatParamName(result.x_axis_name)}: %{x}<br>${formatParamName(result.y_axis_name || '')}: %{y}<br>${zLabel}: %{z:.2f}<extra></extra>`,
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    xaxis: {
      title: { text: formatParamName(result.x_axis_name), font: { color: '#9ca3af' } },
      tickfont: { color: '#9ca3af' },
      gridcolor: '#374151',
    },
    yaxis: {
      title: { text: formatParamName(result.y_axis_name || ''), font: { color: '#9ca3af' } },
      tickfont: { color: '#9ca3af' },
      gridcolor: '#374151',
    },
    margin: { l: 80, r: 50, t: 30, b: 60 },
    font: { color: '#9ca3af' },
  };

  return (
    <div className="h-[500px]">
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

/**
 * Main chart component that handles both 1D and 2D sweeps
 */
export function SweepResultsChart({ result }: SweepResultsChartProps) {
  const [metric, setMetric] = useState<MetricType>('latency');
  const [viewType, setViewType] = useState<ViewType>('3d');

  const is2D = result.sweep_type === '2d';

  // Data export helper
  const exportToCSV = () => {
    const headers = [result.x_axis_name];
    if (result.y_axis_name) headers.push(result.y_axis_name);
    headers.push('latency_ms', 'throughput_inferences_per_sec', 'memory_usage_mb');
    
    const rows = result.data_points.map(p => {
      const row = [p.parameter_values[result.x_axis_name]];
      if (result.y_axis_name) row.push(p.parameter_values[result.y_axis_name]);
      row.push(p.latency_ms, p.throughput_inferences_per_sec, p.memory_usage_mb);
      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sweep_results_${result.model_id}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Sweep Results
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {formatParamName(result.x_axis_name)}
            {is2D && result.y_axis_name && ` × ${formatParamName(result.y_axis_name)}`}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Metric toggle */}
          <div className="flex rounded-lg border border-gray-600 overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                metric === 'latency'
                  ? 'bg-tt-purple text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setMetric('latency')}
            >
              Latency
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                metric === 'throughput'
                  ? 'bg-tt-purple text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setMetric('throughput')}
            >
              Throughput
            </button>
          </div>

          {/* View type toggle (only for 2D) */}
          {is2D && (
            <div className="flex rounded-lg border border-gray-600 overflow-hidden">
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewType === '3d'
                    ? 'bg-tt-purple text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setViewType('3d')}
              >
                3D Surface
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewType === 'heatmap'
                    ? 'bg-tt-purple text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setViewType('heatmap')}
              >
                Heatmap
              </button>
            </div>
          )}

          {/* Export button */}
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg border border-gray-600 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Chart */}
      {is2D ? (
        viewType === '3d' ? (
          <Surface3D result={result} metric={metric} />
        ) : (
          <Heatmap2D result={result} metric={metric} />
        )
      ) : (
        <LineChart1D result={result} metric={metric} />
      )}

      {/* Summary stats */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Min Latency</p>
            <p className="text-lg font-semibold text-white">
              {Math.min(...result.data_points.map(p => p.latency_ms)).toFixed(2)} ms
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Max Latency</p>
            <p className="text-lg font-semibold text-white">
              {Math.max(...result.data_points.map(p => p.latency_ms)).toFixed(2)} ms
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Max Throughput</p>
            <p className="text-lg font-semibold text-white">
              {Math.max(...result.data_points.map(p => p.throughput_inferences_per_sec)).toFixed(1)} inf/s
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Data Points</p>
            <p className="text-lg font-semibold text-white">
              {result.data_points.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SweepResultsChart;
