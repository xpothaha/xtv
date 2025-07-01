import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

export interface ISO {
  id: string;
  name: string;
  size: number;
  path: string;
  created_at: string;
}

export function useISOs() {
  return useQuery<ISO[], Error>({
    queryKey: ['isos'],
    queryFn: async () => {
      const { data } = await api.get<{ isos: ISO[] }>('/api/v1/iso');
      return data.isos;
    },
  });
}

export function useUploadISO() {
  const queryClient = useQueryClient();
  
  return useMutation<ISO, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post<ISO>('/api/v1/isos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isos'] });
    },
  });
}

export function useDeleteISO() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/isos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isos'] });
    },
  });
} 