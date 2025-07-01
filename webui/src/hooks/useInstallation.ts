import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api';

export interface InstallationRequest {
  server_name: string;
  ip_config: 'dhcp' | 'static';
  static_ip?: string;
  password: string;
}

export interface InstallationResponse {
  message: string;
  webui_url: string;
  api_url: string;
}

export interface InstallationStatus {
  installed: boolean;
  server_name: string;
  web_port: number;
  api_port: number;
}

export function useInstallationStatus() {
  return useQuery<InstallationStatus, Error>({
    queryKey: ['installation-status'],
    queryFn: async () => {
      const { data } = await api.get<InstallationStatus>('/api/v1/install/status');
      return data;
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: false,
  });
}

export function useInstall() {
  return useMutation<InstallationResponse, Error, InstallationRequest>({
    mutationFn: async (installationData) => {
      const { data } = await api.post<InstallationResponse>('/api/v1/install', installationData);
      return data;
    },
  });
} 