import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectCurrentToken } from './authSlice';

const RedirectIfAuthenticated = ({ children }) => {
    const token = useSelector(selectCurrentToken);

    if (token) {
        return <Navigate to="/welcome" />;
    }

    return children;
};

export default RedirectIfAuthenticated;
