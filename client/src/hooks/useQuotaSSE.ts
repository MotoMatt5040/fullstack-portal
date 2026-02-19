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

  // Store all changing values in refs so connect/disconnect have stable identities
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const tokenRef = useRef(token);
  const projectIdRef = useRef(projectId);
  const isInternalUserRef = useRef(isInternalUser);
  const usernameRef = useRef(user?.username);

  useEffect(() => { onDataRef.current = onData; }, [onData]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onConnectedRef.current = onConnected; }, [onConnected]);
  useEffect(() => { onDisconnectedRef.current = onDisconnected; }, [onDisconnected]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);
  useEffect(() => { isInternalUserRef.current = isInternalUser; }, [isInternalUser]);
  useEffect(() => { usernameRef.current = user?.username; }, [user?.username]);

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
    if (!tokenRef.current || !projectIdRef.current) return;

    disconnect();

    try {
      const username = encodeURIComponent(usernameRef.current || 'Anonymous');
      const url = `/api/quota-management/events?projectId=${encodeURIComponent(projectIdRef.current)}&username=${username}&isInternalUser=${isInternalUserRef.current}`;

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
          if (tokenRef.current && projectIdRef.current) connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating quota EventSource:', error);
    }
  }, [disconnect]);

  // Only reconnect when the actual subscription parameters change
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
