// client/src/hooks/useSessionTimeout.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  logOut,
  selectCurrentToken,
  setCredentials,
} from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApiSlice';

interface UseSessionTimeoutReturn {
  isWarningVisible: boolean;
  extendSession: () => void;
  performLogout: () => void;
  getRemainingTime: () => number;
  testWarning: () => void;
  warningDuration: number;
}

const useSessionTimeout = (): UseSessionTimeoutReturn => {
  const dispatch = useDispatch();
  const [logoutRequest] = useLogoutMutation();
  const [isWarningVisible, setIsWarningVisible] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(Date.now());

  const token = useSelector(selectCurrentToken);
  const isAuthenticated = !!token;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const TEST_MODE = false;

  const TIMEOUT_DURATION = TEST_MODE ? 20 * 1000 : 15 * 60 * 1000;
  const WARNING_DURATION = TEST_MODE ? 10 * 1000 : 2 * 60 * 1000;
  const TOKEN_REFRESH_THRESHOLD = TEST_MODE ? 15 * 1000 : 13 * 60 * 1000;

  const getPersistStatus = (): boolean => {
    return document.cookie.includes('persist=true');
  };

  const performLogout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
      dispatch(logOut());
    } catch (err) {
      console.error('Logout failed:', err);
      dispatch(logOut());
    }
  }, [dispatch, logoutRequest]);

  const clearTimeouts = (): void => {
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
  };

  const refreshAccessToken = useCallback(
    async (forceRefresh: boolean = false): Promise<boolean> => {
      if (!forceRefresh && !getPersistStatus()) {
        console.log('🔄 Skipping token refresh - persist not enabled');
        return false;
      }

      try {
        console.log('🔄 Refreshing access token due to approaching expiration');

        // Make direct fetch call to refresh endpoint since we don't have a mutation for it
        const response = await fetch('/api/refresh', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Expires: '0',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            dispatch(setCredentials({ accessToken: data.accessToken }));
            setLastTokenRefresh(Date.now());
            console.log('✅ Access token refreshed successfully');
            return true;
          }
        } else if (response.status === 200) {
          // Backend returns 200 when persist is false, this is normal
          console.log('🔄 Token refresh skipped - persist disabled on backend');
          return false;
        } else {
          console.log('❌ Token refresh failed:', response.status);
          return false;
        }
      } catch (error) {
        console.error('❌ Error refreshing token:', error);
        return false;
      }
      return false;
    },
    [dispatch]
  );

  const scheduleTokenRefresh = useCallback((): void => {
    if (tokenRefreshRef.current) {
      clearTimeout(tokenRefreshRef.current);
    }

    const timeSinceLastRefresh = Date.now() - lastTokenRefresh;
    const timeUntilRefresh = TOKEN_REFRESH_THRESHOLD - timeSinceLastRefresh;

    if (timeUntilRefresh <= 0) {
      // Should refresh immediately
      refreshAccessToken();
    } else {
      console.log(
        `📅 Scheduling token refresh in ${Math.floor(
          timeUntilRefresh / 1000
        )} seconds`
      );
      tokenRefreshRef.current = setTimeout(() => {
        refreshAccessToken();
      }, timeUntilRefresh);
    }
  }, [lastTokenRefresh, refreshAccessToken, TOKEN_REFRESH_THRESHOLD]);

  const startTimeouts = useCallback((): void => {
    const persistStatus = getPersistStatus();
    

    if (!isAuthenticated) {
      console.log('Session timeout disabled - not authenticated');
      return;
    }
    console.log(
      `Starting session timeouts - total: ${TIMEOUT_DURATION}ms, warning at: ${
        TIMEOUT_DURATION - WARNING_DURATION
      }ms`
    );
    clearTimeouts();

    // Schedule token refresh if persist is enabled
    if (persistStatus) {
      scheduleTokenRefresh();
    }

    // Set warning timeout
    warningRef.current = setTimeout(() => {
      console.log('⚠️ SHOWING SESSION WARNING MODAL ⚠️');
      setIsWarningVisible(true);
    }, TIMEOUT_DURATION - WARNING_DURATION);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      console.log('🔴 SESSION TIMEOUT - LOGGING OUT 🔴');
      performLogout();
    }, TIMEOUT_DURATION);

    console.log(
      'Timeouts set - warning in',
      (TIMEOUT_DURATION - WARNING_DURATION) / 1000,
      'seconds, logout in',
      TIMEOUT_DURATION / 1000,
      'seconds'
    );
  }, [
    isAuthenticated,
    TIMEOUT_DURATION,
    WARNING_DURATION,
    performLogout,
    scheduleTokenRefresh,
    getPersistStatus,
  ]);

  const resetTimeout = useCallback((): void => {

    console.log('Activity detected - resetting timeout');
    setLastActivity(Date.now());
    setIsWarningVisible(false);

    // Always check if we need to refresh the token based on time elapsed
    // This ensures frontend/backend stay in sync regardless of persist status
    const timeSinceLastRefresh = Date.now() - lastTokenRefresh;
    if (timeSinceLastRefresh >= TOKEN_REFRESH_THRESHOLD) {
      console.log(
        '🔄 Activity detected and token refresh threshold reached, refreshing now'
      );
      refreshAccessToken(true);
    } else {
      console.log(
        `⏱️ Token refresh not needed yet. ${Math.floor(
          (TOKEN_REFRESH_THRESHOLD - timeSinceLastRefresh) / 1000
        )}s remaining`
      );
    }

    startTimeouts();
  }, [
    lastTokenRefresh,
    TOKEN_REFRESH_THRESHOLD,
    refreshAccessToken,
    startTimeouts,
  ]);

  const extendSession = useCallback(async (): void => {
    console.log('User manually extended session');
    const success = await refreshAccessToken(true);

    if (success || !getPersistStatus()) {
      resetTimeout();
      console.log('✅ Session extended successfully');
    } else {
      console.error('❌ Failed to extend session');
      performLogout();
    }
  }, [refreshAccessToken, resetTimeout, performLogout]);

  const getRemainingTime = useCallback((): number => {
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, TIMEOUT_DURATION - elapsed);
  }, [lastActivity, TIMEOUT_DURATION]);

  // Reset lastTokenRefresh when a new token is received (e.g., after login)
  useEffect(() => {
    if (token) {
      setLastTokenRefresh(Date.now());
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      setIsWarningVisible(false);
      return;
    }

    if (getPersistStatus()) {
      console.log('Persist is enabled, session timeouts will not be set');
      return;
    }

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

    let throttleTimeout: NodeJS.Timeout | null = null;
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

    startTimeouts();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledReset, true);
      });
      clearTimeouts();
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isAuthenticated, resetTimeout, startTimeouts]);

  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  const testWarning = (): void => {
    setIsWarningVisible(true);
  };

  useEffect(() => {
    (window as any).testSessionWarning = testWarning;
    return () => {
      delete (window as any).testSessionWarning;
    };
  }, []);

  return {
    isWarningVisible,
    extendSession,
    performLogout,
    getRemainingTime,
    testWarning,
    warningDuration: WARNING_DURATION,
  };
};

export default useSessionTimeout;
