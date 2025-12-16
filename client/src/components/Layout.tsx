import React, { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import NavBar from './NavBar';
import Breadcrumbs from './Breadcrumbs';
import SessionWarningModal from './SessionWarningModal';
import GlobalSearch from './GlobalSearch';
import MaintenanceNotification from './MaintenanceNotification';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import useServerNotifications from '../hooks/useServerNotifications';
import { selectCurrentToken } from '../features/auth/authSlice';
import { useToast } from '../context/ToastContext';

interface RootState {
  auth: {
    token: string | null;
  };
}

interface MaintenanceData {
  title: string;
  message: string;
  minutes: number;
  timestamp: string;
}

const Layout: React.FC = () => {
  const [isNavVisible, setIsNavVisible] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null);
  const location = useLocation();
  const publicRoutes: string[] = ['/login', '/reset-password', '/'];
  const token = useSelector((state: RootState) => selectCurrentToken(state));
  const toast = useToast();

  const isProtectedRoute: boolean = !publicRoutes.includes(location.pathname);
  const isAuthenticated: boolean = !!token;

  const sessionTimeout = useSessionTimeout();

  // Connect to server notifications (SSE)
  useServerNotifications({
    onMaintenance: (notification) => {
      setMaintenanceData({
        title: notification.title,
        message: notification.message,
        minutes: notification.minutes,
        timestamp: notification.timestamp,
      });
    },
    onNotification: (notification) => {
      // Show general notifications as toasts
      switch (notification.type) {
        case 'success':
          toast.success(notification.message, notification.title);
          break;
        case 'error':
          toast.error(notification.message, notification.title);
          break;
        case 'warning':
          toast.warning(notification.message, notification.title);
          break;
        default:
          toast.info(notification.message, notification.title);
      }
    },
  });

  const dismissMaintenance = useCallback(() => {
    setMaintenanceData(null);
  }, []);

  // Listen for session invalidation events (logged in from another location)
  useEffect(() => {
    const handleSessionInvalidated = (event: CustomEvent) => {
      toast.warning(
        event.detail?.message || 'Your session has been invalidated.',
        'Session Ended'
      );
    };

    window.addEventListener('session-invalidated', handleSessionInvalidated as EventListener);
    return () => {
      window.removeEventListener('session-invalidated', handleSessionInvalidated as EventListener);
    };
  }, [toast]);

  const handleNavToggle = (visibility: boolean): void => {
    setIsNavVisible(visibility);
  };

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Global keyboard shortcuts - always enabled, auth check happens in action
  const handleSearchShortcut = useCallback(() => {
    // Check token directly from the current state when shortcut is triggered
    if (token) {
      openSearch();
    }
  }, [token, openSearch]);

  useKeyboardShortcuts(
    [
      {
        key: '/',
        ctrl: true,
        meta: true,
        action: handleSearchShortcut,
        description: 'Open search',
      },
    ],
    { enabled: isProtectedRoute }
  );

  return (
    <section>
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {isProtectedRoute && <NavBar onToggleNav={handleNavToggle} />}
      {isProtectedRoute && <Breadcrumbs />}

      <main id="main-content" className={isNavVisible ? 'navbar-visible' : ''} tabIndex={-1}>
        <Outlet />
      </main>

      {isAuthenticated && (
        <>
          <SessionWarningModal
            isVisible={sessionTimeout.isWarningVisible}
            onExtend={sessionTimeout.extendSession}
            onLogout={sessionTimeout.performLogout}
            getRemainingTime={sessionTimeout.getRemainingTime}
            warningDuration={sessionTimeout.warningDuration}
          />
          <GlobalSearch isOpen={isSearchOpen} onClose={closeSearch} />
          <MaintenanceNotification
            isVisible={!!maintenanceData}
            title={maintenanceData?.title || ''}
            message={maintenanceData?.message || ''}
            initialMinutes={maintenanceData?.minutes || 5}
            timestamp={maintenanceData?.timestamp || new Date().toISOString()}
            onDismiss={dismissMaintenance}
          />
        </>
      )}
    </section>
  );
};

export default Layout;