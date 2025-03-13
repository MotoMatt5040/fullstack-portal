import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';

const Layout = () => {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const location = useLocation();

  // Check if the current route requires authentication
  const isProtectedRoute = location.pathname !== '/login' && location.pathname !== '/reset-password';

  const handleNavToggle = (visibility) => {
    setIsNavVisible(visibility); // Update the navbar visibility state
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
