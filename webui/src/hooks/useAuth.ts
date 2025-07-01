import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordRequest {
  new_password: string;
  confirm_password: string;
}

export interface QuotaInfo {
  user: string;
  quota: {
    max_vms: number;
    max_cpu: number;
    max_memory: number;
    max_storage: number;
    max_gpu: number;
  };
  usage: {
    vms: number;
    cpu: number;
    memory: number;
    storage: number;
    gpu: number;
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      const { data } = await api.post<LoginResponse>('/api/v1/login', credentials);
      // Store token in localStorage
      localStorage.setItem('xtv_token', data.token);
      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error>({
    mutationFn: async () => {
      await api.post('/api/v1/logout');
      // Clear token from localStorage
      localStorage.removeItem('xtv_token');
      // Remove authorization header
      delete api.defaults.headers.common['Authorization'];
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation<void, Error, ChangePasswordRequest>({
    mutationFn: async (passwords) => {
      await api.post('/api/v1/change-password', passwords);
    },
  });
}

export function useResetPassword() {
  return useMutation<void, Error, ResetPasswordRequest>({
    mutationFn: async (passwords) => {
      await api.post('/api/v1/reset-password', passwords);
    },
  });
}

export function useQuota(userId: string) {
  return useQuery<QuotaInfo, Error>({
    queryKey: ['quota', userId],
    queryFn: async () => {
      const { data } = await api.get<QuotaInfo>(`/api/v1/quota/${userId}`);
      return data;
    },
  });
}

// Add useAuth hook
export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('xtv_token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    setIsAuthenticated(true);
    localStorage.setItem('xtv_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('xtv_token');
    delete api.defaults.headers.common['Authorization'];
  };

  return {
    token,
    isAuthenticated,
    login,
    logout
  };
}

// Initialize auth token on app start
export function initializeAuth() {
  const token = localStorage.getItem('xtv_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
} 