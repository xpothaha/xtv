import { useWebSocket } from './useWebSocket';

export interface GPUEvent {
  type: string; // e.g. 'usage', 'profile_created', 'profile_deleted', etc.
  data: any;
  timestamp: string;
}

export function useGPUEvents(onEvent: (event: GPUEvent) => void) {
  useWebSocket({
    url: 'ws://localhost:8080/ws/gpu',
    onMessage: (message) => {
      if (message.type && onEvent) {
        onEvent(message as GPUEvent);
      }
    },
  });
} 