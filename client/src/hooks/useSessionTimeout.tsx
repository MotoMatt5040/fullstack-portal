// client/src/hooks/useSessionTimeout.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  logOut,
  selectCurrentToken,
  setCredentials,
} from '../features/auth/authSlice';
import {
  useLogoutMutation,
  useRefreshMutation,
} from '../features/auth/authApiSlice';

interface UseSessionTimeoutReturn {
  isWarningVisible: boolean;
  extendSession: () => void;
  performLogout: () => void;
  getRemainingTime: () => number;
  warningDuration: number;
}

const useSessionTimeout = (): UseSessionTimeoutReturn => {
  const dispatch = useDispatch();
  const [logoutRequest] = useLogoutMutation();
  const [refreshTokenMutation] = useRefreshMutation();

  const [isWarningVisible, setIsWarningVisible] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(Date.now());

  const token = useSelector(selectCurrentToken);
  const isAuthenticated = !!token;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  // Session timeout: 15 minutes of inactivity
  const TIMEOUT_DURATION = 15 * 60 * 1000;
  // Warning shown 2 minutes before timeout
  const WARNING_DURATION = 2 * 60 * 1000;
  // Refresh token 2 minutes before access token expires (13 minutes)
  const TOKEN_REFRESH_INTERVAL = 13 * 60 * 1000;

  const getPersistStatus = (): boolean => {
    return document.cookie.includes('persist=true');
  };

  const performLogout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest(undefined).unwrap();
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      dispatch(logOut());
    }
  }, [dispatch, logoutRequest]);

  const clearAllTimeouts = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (tokenRefreshRef.current) {
      clearTimeout(tokenRefreshRef.current);
      tokenRefreshRef.current = null;
    }
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false;
    }

    try {
      isRefreshingRef.current = true;
      const result = await refreshTokenMutation(undefined).unwrap();

      if (result?.accessToken) {
        dispatch(setCredentials({ accessToken: result.accessToken }));
        setLastTokenRefresh(Date.now());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [dispatch, refreshTokenMutation]);

  const scheduleTokenRefresh = useCallback((): void => {
    if (tokenRefreshRef.current) {
      clearTimeout(tokenRefreshRef.current);
    }

    const timeSinceLastRefresh = Date.now() - lastTokenRefresh;
    const timeUntilRefresh = Math.max(0, TOKEN_REFRESH_INTERVAL - timeSinceLastRefresh);

    tokenRefreshRef.current = setTimeout(async () => {
      const success = await refreshAccessToken();
      if (success) {
        // Schedule next refresh
        scheduleTokenRefresh();
      } else {
        // Refresh failed - log out user
        performLogout();
      }
    }, timeUntilRefresh);
  }, [lastTokenRefresh, refreshAccessToken, performLogout, TOKEN_REFRESH_INTERVAL]);

  const startSessionTimeouts = useCallback((): void => {
    const persistEnabled = getPersistStatus();

    if (!isAuthenticated) {
      return;
    }

    clearAllTimeouts();

    // Always schedule token refresh
    scheduleTokenRefresh();

    // Only set session timeout if persist is disabled
    if (!persistEnabled) {
      // Warning timeout
      warningRef.current = setTimeout(() => {
        setIsWarningVisible(true);
      }, TIMEOUT_DURATION - WARNING_DURATION);

      // Logout timeout
      timeoutRef.current = setTimeout(() => {
        performLogout();
      }, TIMEOUT_DURATION);
    }
  }, [
    isAuthenticated,
    clearAllTimeouts,
    scheduleTokenRefresh,
    performLogout,
    TIMEOUT_DURATION,
    WARNING_DURATION,
  ]);

  const resetTimeout = useCallback((): void => {
    setLastActivity(Date.now());
    setIsWarningVisible(false);
    startSessionTimeouts();
  }, [startSessionTimeouts]);

  const extendSession = useCallback(async (): Promise<void> => {
    const success = await refreshAccessToken();
    if (success) {
      resetTimeout();
    } else {
      performLogout();
    }
  }, [refreshAccessToken, resetTimeout, performLogout]);

  const getRemainingTime = useCallback((): number => {
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, TIMEOUT_DURATION - elapsed);
  }, [lastActivity, TIMEOUT_DURATION]);

  // Reset lastTokenRefresh when token changes (e.g., after login)
  useEffect(() => {
    if (token) {
      setLastTokenRefresh(Date.now());
    }
  }, [token]);

  // Main effect for setting up activity listeners and timeouts
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimeouts();
      setIsWarningVisible(false);
      return;
    }

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttledReset = (): void => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimeout();
          throttleTimeout = null;
        }, 1000);
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledReset, true);
    });

    startSessionTimeouts();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledReset, true);
      });
      clearAllTimeouts();
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isAuthenticated, resetTimeout, startSessionTimeouts, clearAllTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    isWarningVisible,
    extendSession,
    performLogout,
    getRemainingTime,
    warningDuration: WARNING_DURATION,
  };
};

export default useSessionTimeout;
