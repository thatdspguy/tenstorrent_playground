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

export interface HealthResponse {
  status: string;
  version: string;
  simulator_available: boolean;
}
