import React, { useMemo } from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from './authSlice';
import { jwtDecode } from 'jwt-decode';

const RequireAuth = ({ allowedRoles }) => {
  const token = useSelector(selectCurrentToken);
  const location = useLocation();

  // Memoize token decoding to avoid unnecessary recalculations
  const { roles, isExpired } = useMemo(() => {
    if (!token) {
      return { roles: [], isExpired: true };
    }

    try {
      const decoded = jwtDecode(token);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const expired = decoded.exp ? currentTimestamp > decoded.exp : false;

      return {
        roles: decoded?.UserInfo?.roles || [],
        isExpired: expired,
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { roles: [], isExpired: true };
    }
  }, [token]);

  // No token - redirect to login
  if (!token) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Token expired - the apiSlice will handle refresh on next API call
  // For now, let the user through but the refresh will happen automatically
  // when they make their first API call

  // Check role-based access
  const hasAccess = roles.some((role) => allowedRoles?.includes(role));

  if (!hasAccess) {
    return <Navigate to='/unauthorized' state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
