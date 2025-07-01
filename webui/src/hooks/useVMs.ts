import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export interface VM {
  id: string;
  name: string;
  status: string;
  cpu: { cores: number; sockets: number; };
  memory: { size: number; };
  created_at: string;
  updated_at: string;
}

export interface VMStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_rx: number;
  network_tx: number;
  uptime: string;
}

export function useVMs() {
  return useQuery<VM[], Error>({
    queryKey: ['vms'],
    queryFn: async () => {
      const { data } = await api.get<VM[]>('/api/v1/vms');
      return data;
    },
  });
}

export function useVM(id: string) {
  return useQuery<VM, Error>({
    queryKey: ['vm', id],
    queryFn: async () => {
      const { data } = await api.get<VM>(`/api/v1/vms/${id}`);
      return data;
    },
  });
}

export function useVMStats(id: string) {
  return useQuery<VMStats, Error>({
    queryKey: ['vm-stats', id],
    queryFn: async () => {
      const { data } = await api.get<VMStats>(`/api/v1/vms/${id}/stats`);
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useStartVM() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/vms/${id}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

export function useStopVM() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/vms/${id}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

export function useRestartVM() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/vms/${id}/restart`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

export function usePauseVM() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/vms/${id}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

export function useResumeVM() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/vms/${id}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
}

export function useDeleteVM() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/vms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
    },
  });
} 