import { useQuery } from '@tanstack/react-query';
import api from '../api';

export interface SystemStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  gpu_usage: number;
  vm_running: number;
  vm_total: number;
}

export function useSystemStats() {
  return useQuery<SystemStats, Error>({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const { data } = await api.get<SystemStats>('/api/v1/system/stats');
      return data;
    },
  });
} 