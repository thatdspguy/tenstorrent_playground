import axios from 'axios';
import type {
    HealthResponse,
    ModelInfo,
    SimulationJob,
    SimulationRequest,
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
};

export default apiClient;
