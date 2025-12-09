import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectCurrentToken } from './authSlice';

const RedirectIfAuthenticated = ({ children }) => {
    const token = useSelector(selectCurrentToken);
    const location = useLocation();

    // Get the full URL (pathname + search params + hash) if they were redirected to login
    const fromLocation = location.state?.from;
    const from = fromLocation
        ? `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`
        : '/welcome';

    if (token) {
        // If already authenticated, redirect to the original destination
        return <Navigate to={from} replace />;
    }

    return children;
};

export default RedirectIfAuthenticated;
