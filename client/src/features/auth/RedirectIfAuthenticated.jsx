import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectCurrentToken } from './authSlice';

const RedirectIfAuthenticated = ({ children }) => {
    const token = useSelector(selectCurrentToken);
    const location = useLocation();

    // Get the original destination if they were redirected to login
    const from = location.state?.from?.pathname || '/welcome';

    if (token) {
        // If already authenticated, redirect to the original destination
        return <Navigate to={from} replace />;
    }

    return children;
};

export default RedirectIfAuthenticated;
