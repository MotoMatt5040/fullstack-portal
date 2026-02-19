import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentToken, selectUser } from '../features/auth/authSlice';

interface DispositionSSEData {
  data: {
    web: Record<string, any>;
    webCounts: any[];
  };
}

interface UseDispositionSSEOptions {
  projectId: string;
  onData?: (data: DispositionSSEData['data']) => void;
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

export const useDispositionSSE = (options: UseDispositionSSEOptions) => {
  const { projectId, onData, onError, onConnected, onDisconnected } = options;
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
    if (!token || !projectId) return;

    disconnect();

    try {
      const username = encodeURIComponent(user?.username || 'Anonymous');
      const url = `/api/disposition-report/events?projectId=${encodeURIComponent(projectId)}&username=${username}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
        onConnectedRef.current?.();
      });

      eventSource.addEventListener('disposition-data', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as DispositionSSEData;
          onDataRef.current?.(parsed.data);
        } catch (err) {
          console.error('Error parsing disposition SSE data:', err);
        }
      });

      eventSource.addEventListener('disposition-error', (event: MessageEvent) => {
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
          if (token && projectId) connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating disposition EventSource:', error);
    }
  }, [token, projectId, disconnect, user?.username]);

  useEffect(() => {
    if (projectId && token) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [projectId, token, connect, disconnect]);

  return { isConnected, reconnect: connect, disconnect };
};

export default useDispositionSSE;
