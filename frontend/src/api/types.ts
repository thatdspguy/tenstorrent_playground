// API Types matching backend schemas

export interface ModelParameter {
  name: string;
  display_name: string;
  description: string;
  type: 'int' | 'float' | 'select' | 'bool';
  default: number | string | boolean;
  min?: number;
  max?: number;
  options?: string[];
  sweepable?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  architecture: string;
  input_shape: number[];
  output_shape: number[];
  parameters: ModelParameter[];
  estimated_params: number;
  supported_chips: string[];
}

export interface PerformanceMetrics {
  latency_ms: number;
  throughput_inferences_per_sec: number;
  memory_usage_mb: number;
  total_time_ms: number;
  iterations: number;
}

export interface HardwareComparison {
  simulated: PerformanceMetrics;
  expected_silicon: PerformanceMetrics;
  speedup_factor: number;
}

export interface SimulationResult {
  model_id: string;
  model_name: string;
  batch_size: number;
  chip: string;
  metrics: PerformanceMetrics;
  comparison: HardwareComparison;
  output_sample?: number[];
}

export interface SimulationRequest {
  model_id: string;
  batch_size?: number;
  chip?: string;
  iterations?: number;
  parameters?: Record<string, number | string | boolean>;
}

export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SimulationJob {
  job_id: string;
  status: SimulationStatus;
  request: SimulationRequest;
  result?: SimulationResult;
  error?: string;
  created_at: string;
  completed_at?: string;
  progress: number;
}

export interface SimulatorAvailability {
  chip: string;
  available: boolean;
}

export interface HealthResponse {
  status: string;
  version: string;
  simulator_available: boolean;
  simulators: SimulatorAvailability[];
}

// ============================================================================
// Sweep Simulation Types
// ============================================================================

export type ScaleType = 'linear' | 'logarithmic';

export type SweepStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

export interface ParameterRange {
  start: number;
  end: number;
  num_points: number;
  scale: ScaleType;
}

export interface SweepParameter {
  name: string;
  values: number | ParameterRange;
}

export interface SweepSimulationRequest {
  model_id: string;
  x_axis?: SweepParameter;
  y_axis?: SweepParameter | null;
  fixed_parameters?: Record<string, number | string | boolean>;
  chip?: string;
  iterations?: number;
}

export interface SweepDataPoint {
  parameter_values: Record<string, number>;
  latency_ms: number;
  throughput_inferences_per_sec: number;
  memory_usage_mb: number;
}

export type SweepType = '1d' | '2d';

export interface SweepSimulationResult {
  job_id: string;
  model_id: string;
  model_name: string;
  chip: string;
  sweep_type: SweepType;
  x_axis_name: string;
  x_axis_values: number[];
  y_axis_name?: string | null;
  y_axis_values?: number[] | null;
  data_points: SweepDataPoint[];
  total_points: number;
  completed_points: number;
  status: SweepStatus;
  error?: string;
  created_at?: string;
  completed_at?: string;
}

// Helper type for parameter input mode
export type ParameterMode = 'single' | 'range';

// Configuration for a sweepable parameter
export interface SweepableParameter {
  mode: ParameterMode;
  singleValue: number;
  range: ParameterRange;
}

// ============================================================================
// Digit Recognition Types
// ============================================================================

export interface DigitRecognitionRequest {
  image_data: string; // Base64 encoded image
  chip: string;
}

export interface DigitRecognitionResult {
  predicted_digit: number;
  confidence: number;
  all_confidences: number[];
  latency_ms: number;
  layer_activations?: number[][];
  success: boolean;
  error?: string;
}

export interface ModelArchitectureLayer {
  layer: number;
  type: string;
  in: number;
  out: number;
  matmul_size?: string;
  blocks?: number;
  block_size?: number;
}

export interface ModelArchitectureInfo {
  name: string;
  input_size: number;
  output_size: number;
  architecture: ModelArchitectureLayer[];
  constraint: string;
  total_parameters: number;
  weights_file: string;
}
