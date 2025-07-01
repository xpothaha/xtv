import { useQuery } from '@tanstack/react-query';
import api from '../api';

export interface SystemInfo {
  cpu: any;
  memory: any;
  disk: any;
  network: any;
  host: any;
}

export function useSystemInfo() {
  return useQuery<SystemInfo, Error>({
    queryKey: ['systemInfo'],
    queryFn: async () => {
      const { data } = await api.get<SystemInfo>('/api/v1/system/info');
      return data;
    },
  });
} 