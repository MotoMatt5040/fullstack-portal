import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logOut, selectCurrentToken } from '../features/auth/authSlice';
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
  
  const token = useSelector(selectCurrentToken);
  const isAuthenticated = !!token;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const TEST_MODE = false;
  
  const TIMEOUT_DURATION = TEST_MODE ? 20 * 1000 : 13 * 60 * 1000; 
  const WARNING_DURATION = TEST_MODE ? 10 * 1000 : 2 * 60 * 1000;  

  const getPersistStatus = (): boolean => {
    return document.cookie.includes('persist=true');
  };

  const performLogout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
      dispatch(logOut());
      document.cookie = 'persist=false; path=/';
    } catch (err) {
      console.error('Logout failed:', err);
      dispatch(logOut());
      document.cookie = 'persist=false; path=/';
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
  };

  const startTimeouts = (): void => {
    const persistStatus = getPersistStatus();
    console.log('startTimeouts called - authenticated:', isAuthenticated, 'persist:', persistStatus);
    
    if (!isAuthenticated || persistStatus) {
      console.log('Session timeout disabled - authenticated:', isAuthenticated, 'persist:', persistStatus);
      return;
    }

    console.log(`Starting session timeouts - total: ${TIMEOUT_DURATION}ms, warning at: ${TIMEOUT_DURATION - WARNING_DURATION}ms`);
    clearTimeouts();

    warningRef.current = setTimeout(() => {
      console.log('⚠️ SHOWING SESSION WARNING MODAL ⚠️');
      setIsWarningVisible(true);
    }, TIMEOUT_DURATION - WARNING_DURATION);

    timeoutRef.current = setTimeout(() => {
      console.log('🔴 SESSION TIMEOUT - LOGGING OUT 🔴');
      performLogout();
    }, TIMEOUT_DURATION);
    
    console.log('Timeouts set - warning in', (TIMEOUT_DURATION - WARNING_DURATION) / 1000, 'seconds, logout in', TIMEOUT_DURATION / 1000, 'seconds');
  };

  const resetTimeout = (): void => {
    console.log('Activity detected - resetting timeout');
    setLastActivity(Date.now());
    setIsWarningVisible(false);
    startTimeouts();
  };

  const extendSession = useCallback((): void => {
    resetTimeout();
  }, []);

  const getRemainingTime = useCallback((): number => {
    const elapsed = Date.now() - lastActivity;
    return Math.max(0, TIMEOUT_DURATION - elapsed);
  }, [lastActivity]);

  useEffect(() => {
    console.log('useSessionTimeout mounted - authenticated:', isAuthenticated);
    if (!isAuthenticated) {
      clearTimeouts();
      setIsWarningVisible(false);
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledReset = (): void => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimeout();
          throttleTimeout = null;
        }, 1000);
      }
    };

    console.log('Adding event listeners for session timeout');
    events.forEach(event => {
      document.addEventListener(event, throttledReset, true);
    });

    console.log('Setting up initial timeouts');
    startTimeouts();

    return () => {
      console.log('Cleaning up session timeout');
      events.forEach(event => {
        document.removeEventListener(event, throttledReset, true);
      });
      clearTimeouts();
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isAuthenticated]);

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
    warningDuration: WARNING_DURATION
  };
};

export default useSessionTimeout;