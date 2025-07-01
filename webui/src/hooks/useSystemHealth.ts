import { useQuery } from '@tanstack/react-query';
import api from '../api';

export interface HealthStatus {
  status: string;
  timestamp: number;
  version: string;
  uptime: string;
  disk?: any;
  disk_error?: string;
}

export interface GPUUsage {
  gpus: Array<{
    model: string;
    total: number;
    used: number;
    free: number;
    vram_total: number;
    vram_used: number;
    vram_free: number;
    utilization: number;
  }>;
  note: string;
}

export interface CPUInfo {
  model: string;
  cores: number;
  sockets: number;
  threads: number;
  frequency: number;
  cache: number;
  flags: string[];
  numa_nodes: number;
}

export function useHealthStatus() {
  return useQuery<HealthStatus, Error>({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await api.get<HealthStatus>('/api/v1/health');
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useGPUUsage() {
  return useQuery<GPUUsage, Error>({
    queryKey: ['gpu-usage'],
    queryFn: async () => {
      const { data } = await api.get<GPUUsage>('/api/v1/gpu/usage');
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useCPUInfo() {
  return useQuery<CPUInfo, Error>({
    queryKey: ['cpu-info'],
    queryFn: async () => {
      const { data } = await api.get<CPUInfo>('/api/v1/system/cpuinfo');
      return data;
    },
  });
} 