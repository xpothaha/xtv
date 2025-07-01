import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export interface RealTimeStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  active_vms: number;
  timestamp: string;
}

export function useRealTimeStats() {
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { isConnected: wsConnected } = useWebSocket({
    url: 'ws://localhost:8080/ws/stats',
    onMessage: (message) => {
      if (message.type === 'system_stats') {
        setStats(message.data);
      }
    },
    onOpen: () => {
      setIsConnected(true);
    },
    onClose: () => {
      setIsConnected(false);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    },
  });

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  return {
    stats,
    isConnected,
  };
} 