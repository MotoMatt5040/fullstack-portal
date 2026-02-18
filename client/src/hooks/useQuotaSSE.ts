import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentToken, selectUser } from '../features/auth/authSlice';

interface QuotaSSEData {
  visibleStypes: Record<string, any>;
  data: Record<string, any>;
}

interface UseQuotaSSEOptions {
  projectId: string | null;
  isInternalUser: boolean;
  onData?: (data: QuotaSSEData) => void;
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

export const useQuotaSSE = (options: UseQuotaSSEOptions) => {
  const { projectId, isInternalUser, onData, onError, onConnected, onDisconnected } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const token = useSelector((state: RootState) => selectCurrentToken(state));
  const user = useSelector((state: RootState) => selectUser(state));

  // Store callbacks in refs to avoid recreating the connect function
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
      const url = `/api/quota-management/events?projectId=${encodeURIComponent(projectId)}&username=${username}&isInternalUser=${isInternalUser}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
        onConnectedRef.current?.();
      });

      eventSource.addEventListener('quota-data', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as QuotaSSEData;
          onDataRef.current?.(data);
        } catch (err) {
          console.error('Error parsing quota SSE data:', err);
        }
      });

      eventSource.addEventListener('quota-error', (event: MessageEvent) => {
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

        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (token && projectId) connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating quota EventSource:', error);
    }
  }, [token, projectId, isInternalUser, disconnect, user?.username]);

  useEffect(() => {
    if (projectId && token) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [projectId, token, isInternalUser, connect, disconnect]);

  return { isConnected, reconnect: connect, disconnect };
};

export default useQuotaSSE;
