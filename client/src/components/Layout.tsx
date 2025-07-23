import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import NavBar from './NavBar';
import SessionWarningModal from './SessionWarningModal';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { selectCurrentToken } from '../features/auth/authSlice';

interface RootState {
  auth: {
    token: string | null;
  };
}

const Layout: React.FC = () => {
  const [isNavVisible, setIsNavVisible] = useState<boolean>(false);
  const location = useLocation();
  const publicRoutes: string[] = ['/login', '/reset-password', '/'];
  const token = useSelector((state: RootState) => selectCurrentToken(state));
  
  const isProtectedRoute: boolean = !publicRoutes.includes(location.pathname);
  const isAuthenticated: boolean = !!token;

  const sessionTimeout = useSessionTimeout();

  const handleNavToggle = (visibility: boolean): void => {
    setIsNavVisible(visibility);
  };

  return (
    <section>
      {isProtectedRoute && <NavBar onToggleNav={handleNavToggle} />}

      <main className={isNavVisible ? 'navbar-visible' : ''}>
        <Outlet />
      </main>

      {isAuthenticated && (
        <SessionWarningModal
          isVisible={sessionTimeout.isWarningVisible}
          onExtend={sessionTimeout.extendSession}
          onLogout={sessionTimeout.performLogout}
          getRemainingTime={sessionTimeout.getRemainingTime}
          warningDuration={sessionTimeout.warningDuration}
        />
      )}
    </section>
  );
};

export default Layout;