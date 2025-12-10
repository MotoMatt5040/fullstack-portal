import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import NavBar from './NavBar';
import Breadcrumbs from './Breadcrumbs';
import SessionWarningModal from './SessionWarningModal';
import GlobalSearch from './GlobalSearch';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { selectCurrentToken } from '../features/auth/authSlice';

interface RootState {
  auth: {
    token: string | null;
  };
}

const Layout: React.FC = () => {
  const [isNavVisible, setIsNavVisible] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const location = useLocation();
  const publicRoutes: string[] = ['/login', '/reset-password', '/'];
  const token = useSelector((state: RootState) => selectCurrentToken(state));

  const isProtectedRoute: boolean = !publicRoutes.includes(location.pathname);
  const isAuthenticated: boolean = !!token;

  const sessionTimeout = useSessionTimeout();

  const handleNavToggle = (visibility: boolean): void => {
    setIsNavVisible(visibility);
  };

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Global keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: '/',
        ctrl: true,
        meta: true,
        action: openSearch,
        description: 'Open search',
      },
    ],
    { enabled: isAuthenticated }
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
        </>
      )}
    </section>
  );
};

export default Layout;