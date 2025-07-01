import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export interface VMEvent {
  type: string; // e.g. 'created', 'started', 'stopped', 'deleted', etc.
  data: any;
  timestamp: string;
}

export function useVMEvents(onEvent: (event: VMEvent) => void) {
  useWebSocket({
    url: 'ws://localhost:8080/ws/vm',
    onMessage: (message) => {
      if (message.type && onEvent) {
        onEvent(message as VMEvent);
      }
    },
  });
} 