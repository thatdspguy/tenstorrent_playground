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
import type Plotly from 'plotly.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import Plot from 'react-plotly.js';
import type { SweepDataPoint, SweepSimulationResult } from '../api/types';
import type { ChartConfig } from './ChartConfigPanel';

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
  config?: ChartConfig;
}

// Color schemes
const COLOR_SCHEMES = {
  purple: ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'],
  viridis: ['#440154', '#482878', '#3e4a89', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
  plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
};

const PLOTLY_COLORSCALES: Record<string, Plotly.ColorScale> = {
  purple: [
    [0, '#7c3aed'],
    [0.5, '#a78bfa'],
    [1, '#c4b5fd'],
  ] as unknown as Plotly.ColorScale,
  viridis: 'Viridis' as unknown as Plotly.ColorScale,
  plasma: 'Plasma' as unknown as Plotly.ColorScale,
};

export function DualChartView({ result, config }: DualChartViewProps) {
  const visualizationType = config?.visualizationType ?? 'line';
  const colorScheme = config?.colorScheme ?? 'purple';
  const showLegend = config?.showLegend ?? true;
  const colors = COLOR_SCHEMES[colorScheme];

  const is2D = result.sweep_type === '2d' && result.y_axis_name;

  // For 2D sweeps with non-line visualization, use 3D/heatmap
  const useAdvancedViz = is2D && visualizationType !== 'line';

  return (
    <div className="space-y-4">
      {/* Chart Legend for 2D line sweeps */}
      {is2D && visualizationType === 'line' && result.y_axis_values && showLegend && (
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
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span className="text-xs text-gray-300">
                  {formatParamName(result.y_axis_name || '')} = {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {useAdvancedViz ? (
        // 3D Surface or Heatmap for 2D sweeps
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Latency Analysis</h4>
            {visualizationType === 'surface' ? (
              <Surface3D result={result} metric="latency" colorScheme={colorScheme} />
            ) : (
              <Heatmap2D result={result} metric="latency" colorScheme={colorScheme} />
            )}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Throughput Analysis</h4>
            {visualizationType === 'surface' ? (
              <Surface3D result={result} metric="throughput" colorScheme={colorScheme} />
            ) : (
              <Heatmap2D result={result} metric="throughput" colorScheme={colorScheme} />
            )}
          </div>
        </div>
      ) : (
        // Line charts (default for 1D, optional for 2D)
        <LineCharts result={result} colors={colors} showLegend={showLegend} />
      )}

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

// ============================================================================
// Sub-components
// ============================================================================

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

// ============================================================================
// Line Charts Component
// ============================================================================

function LineCharts({ 
  result, 
  colors, 
  showLegend 
}: { 
  result: SweepSimulationResult; 
  colors: string[];
  showLegend: boolean;
}) {
  const { chartData: latencyData, yAxisLabel: latencyLabel } = useMemo(() => {
    return buildChartData(result, 'latency_ms', colors);
  }, [result, colors]);

  const { chartData: throughputData, yAxisLabel: throughputLabel } = useMemo(() => {
    return buildChartData(result, 'throughput_inferences_per_sec', colors);
  }, [result, colors]);

  const latencyOptions = useMemo(() => 
    buildChartOptions('Latency Analysis', latencyLabel, result.x_axis_name, showLegend),
    [latencyLabel, result.x_axis_name, showLegend]
  );

  const throughputOptions = useMemo(() => 
    buildChartOptions('Throughput Analysis', throughputLabel, result.x_axis_name, showLegend),
    [throughputLabel, result.x_axis_name, showLegend]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="h-[300px]">
          <Line options={latencyOptions} data={latencyData} />
        </div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="h-[300px]">
          <Line options={throughputOptions} data={throughputData} />
        </div>
      </div>
    </div>
  );
}

function buildChartData(
  result: SweepSimulationResult,
  metric: 'latency_ms' | 'throughput_inferences_per_sec',
  colors: string[]
) {
  const is2D = result.sweep_type === '2d' && result.y_axis_name && result.y_axis_values;

  if (is2D && result.y_axis_values) {
    const datasets = result.y_axis_values.map((yVal, idx) => {
      const filteredData = result.data_points.filter(
        d => d.parameter_values[result.y_axis_name!] === yVal
      );
      
      return {
        label: `${formatParamName(result.y_axis_name!)} = ${yVal}`,
        data: filteredData.map(d => d[metric]),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
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
    return {
      chartData: {
        labels: result.x_axis_values.map(v => v.toString()),
        datasets: [{
          label: metric === 'latency_ms' ? 'Latency' : 'Throughput',
          data: result.data_points.map(d => d[metric]),
          borderColor: colors[0],
          backgroundColor: colors[0] + '20',
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
  xAxisName: string,
  showLegend: boolean
): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
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

// ============================================================================
// 3D Surface Component
// ============================================================================

type MetricType = 'latency' | 'throughput';

function getMetricValue(point: SweepDataPoint, metric: MetricType): number {
  return metric === 'latency' ? point.latency_ms : point.throughput_inferences_per_sec;
}

function Surface3D({
  result,
  metric,
  colorScheme,
}: {
  result: SweepSimulationResult;
  metric: MetricType;
  colorScheme: string;
}) {
  const xValues = [...result.x_axis_values].sort((a, b) => a - b);
  const yValues = result.y_axis_values ? [...result.y_axis_values].sort((a, b) => a - b) : [];

  const dataMap = useMemo(() => {
    const map = new Map<string, SweepDataPoint>();
    result.data_points.forEach(p => {
      const xVal = p.parameter_values[result.x_axis_name];
      const yVal = result.y_axis_name ? p.parameter_values[result.y_axis_name] : null;
      map.set(`${xVal}-${yVal}`, p);
    });
    return map;
  }, [result.data_points, result.x_axis_name, result.y_axis_name]);

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
      colorscale: PLOTLY_COLORSCALES[colorScheme],
      opacity: 0.9,
      contours: {
        x: { show: true, usecolormap: true, highlightcolor: '#a78bfa' },
        y: { show: true, usecolormap: true, highlightcolor: '#a78bfa' },
        z: { show: true, usecolormap: true, highlightcolor: '#a78bfa' },
      } as any,
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
    margin: { l: 0, r: 0, t: 10, b: 0 },
    font: { color: '#9ca3af' },
  };

  return (
    <div className="h-[300px]">
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// ============================================================================
// Heatmap Component
// ============================================================================

function Heatmap2D({
  result,
  metric,
  colorScheme,
}: {
  result: SweepSimulationResult;
  metric: MetricType;
  colorScheme: string;
}) {
  const xValues = [...result.x_axis_values].sort((a, b) => a - b);
  const yValues = result.y_axis_values ? [...result.y_axis_values].sort((a, b) => a - b) : [];

  const dataMap = useMemo(() => {
    const map = new Map<string, SweepDataPoint>();
    result.data_points.forEach(p => {
      const xVal = p.parameter_values[result.x_axis_name];
      const yVal = result.y_axis_name ? p.parameter_values[result.y_axis_name] : null;
      map.set(`${xVal}-${yVal}`, p);
    });
    return map;
  }, [result.data_points, result.x_axis_name, result.y_axis_name]);

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
      colorscale: PLOTLY_COLORSCALES[colorScheme],
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
    margin: { l: 60, r: 30, t: 10, b: 50 },
    font: { color: '#9ca3af' },
  };

  return (
    <div className="h-[300px]">
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default DualChartView;
