import { useWebSocket } from './useWebSocket';

export interface NetworkEvent {
  type: string; // e.g. 'ip_changed', 'migration', 'error', etc.
  data: any;
  timestamp: string;
}

export function useNetworkEvents(onEvent: (event: NetworkEvent) => void) {
  useWebSocket({
    url: 'ws://localhost:8080/ws/network',
    onMessage: (message) => {
      if (message.type && onEvent) {
        onEvent(message as NetworkEvent);
      }
    },
  });
} 