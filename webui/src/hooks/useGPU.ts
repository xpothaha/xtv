import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export interface GPU {
  model: string;
  total: number;
  used: number;
  free: number;
  vram_total: number;
  vram_used: number;
  vram_free: number;
  utilization: number;
  // เพิ่ม field อื่นๆ ตาม backend response ถ้ามี
}

export interface VGPUProfile {
  id: string;
  name: string;
  memory: number;
  max_instances: number;
  current_instances: number;
}

export function useGPUs() {
  return useQuery<GPU[], Error>({
    queryKey: ['gpus'],
    queryFn: async () => {
      const { data } = await api.get<{ gpus: GPU[] }>('/api/v1/gpu/usage');
      return data.gpus || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time monitoring
  });
}

export function useVGPUProfiles() {
  return useQuery<VGPUProfile[], Error>({
    queryKey: ['vgpu-profiles'],
    queryFn: async () => {
      const { data } = await api.get<{ profiles: VGPUProfile[] }>('/api/v1/vgpu/profiles');
      return data.profiles || [];
    },
  });
}

export function useCreateVGPUProfile() {
  const queryClient = useQueryClient();
  
  return useMutation<VGPUProfile, Error, Partial<VGPUProfile>>({
    mutationFn: async (profile) => {
      const { data } = await api.post<VGPUProfile>('/api/v1/vgpu/profiles', profile);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vgpu-profiles'] });
    },
  });
}

export function useDeleteVGPUProfile() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/vgpu/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vgpu-profiles'] });
    },
  });
} 