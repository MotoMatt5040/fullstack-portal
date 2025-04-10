import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';

const Layout = () => {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const location = useLocation();
  const publicRoutes = ['/login', '/reset-password', '/'];
  
  const isProtectedRoute = !publicRoutes.includes(location.pathname);

  const handleNavToggle = (visibility) => {
    setIsNavVisible(visibility);
  };

  return (
    <section>
      {/* Render NavBar only for protected routes */}
      {isProtectedRoute && <NavBar onToggleNav={handleNavToggle} />}

      {/* Adjust main content based on navbar visibility */}
      <main className={isNavVisible ? 'navbar-visible' : ''}>
        <Outlet />
      </main>
    </section>
  );
};

export default Layout;
