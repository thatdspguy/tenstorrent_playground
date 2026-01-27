import axios from 'axios';
import type {
    DigitRecognitionRequest,
    DigitRecognitionResult,
    HealthResponse,
    ModelArchitectureInfo,
    ModelInfo,
    SimulationJob,
    SimulationRequest,
    SweepSimulationRequest,
    SweepSimulationResult,
} from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Health check
  async getHealth(): Promise<HealthResponse> {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },

  // Models
  async listModels(): Promise<ModelInfo[]> {
    const response = await api.get<ModelInfo[]>('/models');
    return response.data;
  },

  async getModel(modelId: string): Promise<ModelInfo> {
    const response = await api.get<ModelInfo>(`/models/${modelId}`);
    return response.data;
  },

  // Simulation
  async runSimulation(request: SimulationRequest): Promise<SimulationJob> {
    const response = await api.post<SimulationJob>('/simulate', request);
    return response.data;
  },

  async getJob(jobId: string): Promise<SimulationJob> {
    const response = await api.get<SimulationJob>(`/simulate/${jobId}`);
    return response.data;
  },

  async listJobs(limit = 10): Promise<SimulationJob[]> {
    const response = await api.get<SimulationJob[]>('/jobs', {
      params: { limit },
    });
    return response.data;
  },

  // Sweep Simulation
  async runSweep(request: SweepSimulationRequest): Promise<SweepSimulationResult> {
    const response = await api.post<SweepSimulationResult>('/sweep', request);
    return response.data;
  },

  async getSweepStatus(jobId: string): Promise<SweepSimulationResult> {
    const response = await api.get<SweepSimulationResult>(`/sweep/${jobId}`);
    return response.data;
  },

  async cancelSweep(jobId: string): Promise<{ status: string; job_id: string }> {
    const response = await api.post<{ status: string; job_id: string }>(`/sweep/${jobId}/cancel`);
    return response.data;
  },

  async listSweeps(limit = 10): Promise<SweepSimulationResult[]> {
    const response = await api.get<SweepSimulationResult[]>('/sweeps', {
      params: { limit },
    });
    return response.data;
  },

  // Digit Recognition
  async recognizeDigit(request: DigitRecognitionRequest): Promise<DigitRecognitionResult> {
    const response = await api.post<DigitRecognitionResult>('/digit-recognition', request);
    return response.data;
  },

  async getDigitRecognitionModelInfo(): Promise<ModelArchitectureInfo> {
    const response = await api.get<ModelArchitectureInfo>('/digit-recognition/model-info');
    return response.data;
  },
};

export default apiClient;
