// client/src/hooks/useServerNotifications.ts
// Hook for connecting to Server-Sent Events and receiving real-time notifications

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { selectCurrentToken, selectCurrentUser } from '../features/auth/authSlice';

interface MaintenanceNotification {
  type: 'maintenance';
  title: string;
  message: string;
  minutes: number;
  timestamp: string;
}

interface GeneralNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

interface UseServerNotificationsOptions {
  onMaintenance?: (notification: MaintenanceNotification) => void;
  onNotification?: (notification: GeneralNotification) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface RootState {
  auth: {
    token: string | null;
    user: string | null;
  };
}

export const useServerNotifications = (options: UseServerNotificationsOptions = {}) => {
  const { onMaintenance, onNotification, onConnected, onDisconnected } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const token = useSelector((state: RootState) => selectCurrentToken(state));
  const user = useSelector((state: RootState) => selectCurrentUser(state));
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid recreating the connect function
  const onMaintenanceRef = useRef(onMaintenance);
  const onNotificationRef = useRef(onNotification);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);

  // Update refs when callbacks change
  useEffect(() => {
    onMaintenanceRef.current = onMaintenance;
  }, [onMaintenance]);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
  }, [onDisconnected]);

  const connect = useCallback(() => {
    // Don't connect if no token (not authenticated)
    if (!token) {
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Include username in the connection URL
      const username = encodeURIComponent(user || 'Anonymous');
      const eventSource = new EventSource(`/api/notifications/events?username=${username}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', (event) => {
        console.log('Connected to notification service');
        try {
          const data = JSON.parse(event.data);
          clientIdRef.current = data.clientId;
        } catch {
          // Ignore parse errors
        }
        setIsConnected(true);
        onConnectedRef.current?.();
      });

      eventSource.addEventListener('maintenance', (event) => {
        try {
          const data = JSON.parse(event.data) as MaintenanceNotification;
          console.log('Maintenance notification received:', data);
          onMaintenanceRef.current?.(data);
        } catch (error) {
          console.error('Error parsing maintenance notification:', error);
        }
      });

      eventSource.addEventListener('notification', (event) => {
        try {
          const data = JSON.parse(event.data) as GeneralNotification;
          console.log('Notification received:', data);
          onNotificationRef.current?.(data);
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      });

      eventSource.addEventListener('heartbeat', () => {
        // Heartbeat received, connection is alive
      });

      eventSource.onerror = () => {
        console.log('SSE connection error, will attempt to reconnect...');
        setIsConnected(false);
        onDisconnectedRef.current?.();
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (token) {
            connect();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating EventSource:', error);
    }
  }, [token]);

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

  useEffect(() => {
    if (token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  // Send page updates when location changes
  useEffect(() => {
    if (isConnected && clientIdRef.current && token) {
      fetch('/api/notifications/page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: clientIdRef.current,
          page: location.pathname,
        }),
      }).catch(() => {
        // Silently ignore page update errors
      });
    }
  }, [location.pathname, isConnected, token]);

  return { isConnected, reconnect: connect, disconnect, clientId: clientIdRef.current };
};

export default useServerNotifications;
