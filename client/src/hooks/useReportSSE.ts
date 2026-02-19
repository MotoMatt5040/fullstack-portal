import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentToken, selectUser } from '../features/auth/authSlice';

interface UseReportSSEOptions {
  projectId?: string;
  useGpcph: boolean;
  enabled: boolean;
  onData?: (data: any[]) => void;
  onError?: (error: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface RootState {
  auth: {
    token: string | null;
    user: string | null;
  };
}

export const useReportSSE = (options: UseReportSSEOptions) => {
  const { projectId, useGpcph, enabled, onData, onError, onConnected, onDisconnected } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const token = useSelector((state: RootState) => selectCurrentToken(state));
  const user = useSelector((state: RootState) => selectUser(state));

  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);

  useEffect(() => { onDataRef.current = onData; }, [onData]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onConnectedRef.current = onConnected; }, [onConnected]);
  useEffect(() => { onDisconnectedRef.current = onDisconnected; }, [onDisconnected]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    disconnect();

    try {
      const username = encodeURIComponent(user?.username || 'Anonymous');
      const params = new URLSearchParams({
        username,
        useGpcph: String(useGpcph),
      });
      if (projectId) {
        params.set('projectId', projectId);
      }

      const url = `/api/reports/events?${params.toString()}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
        onConnectedRef.current?.();
      });

      eventSource.addEventListener('report-data', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          onDataRef.current?.(parsed.data);
        } catch (err) {
          console.error('Error parsing report SSE data:', err);
        }
      });

      eventSource.addEventListener('report-error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          onErrorRef.current?.(data);
        } catch {
          // ignore parse errors
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Connection alive
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        onDisconnectedRef.current?.();
        eventSource.close();
        eventSourceRef.current = null;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (token && enabled) connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating report EventSource:', error);
    }
  }, [token, projectId, useGpcph, enabled, disconnect, user?.username]);

  useEffect(() => {
    if (enabled && token) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [enabled, token, projectId, useGpcph, connect, disconnect]);

  return { isConnected, reconnect: connect, disconnect };
};

export default useReportSSE;
