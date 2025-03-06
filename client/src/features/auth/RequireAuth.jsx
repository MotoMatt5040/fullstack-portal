import React, { useEffect, useState } from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentToken, setCredentials, logOut } from './authSlice';
import { jwtDecode } from 'jwt-decode';
import { useProtectLinkQuery } from './authApiSlice';

const RequireAuth = ({ allowedRoles }) => {
  const token = useSelector(selectCurrentToken);
  const location = useLocation();
  const dispatch = useDispatch();
  const [roles, setRoles] = useState([]);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const { data, error, isLoading, refetch } = useProtectLinkQuery();

  useEffect(() => {
    const checkToken = async () => {
      if (token) {
        try {
          const decoded = jwtDecode(token);
          setRoles(decoded?.UserInfo?.roles || []);
          const expTimestamp = decoded.exp;
          const currentTimestamp = Math.floor(Date.now() / 1000);
          console.log(currentTimestamp - expTimestamp);
          if (currentTimestamp > expTimestamp) {
            // Attempt to refresh the token
            const response = await refetch();
            if (response?.status === 'rejected') {
              dispatch(logOut());
            } else if (response?.data) {
              dispatch(
                setCredentials({ accessToken: response.data.accessToken })
              );
            }
          }
        } catch (error) {
          console.error('Error decoding token', error);
          dispatch(logOut());
        }
      } else {
        dispatch(logOut());
      }
      setIsCheckingToken(false);
    };

    checkToken();
  }, [token, dispatch, location, refetch]);

  if (isLoading || isCheckingToken) {
    return <p>Loading...</p>;
  }

  if (!token) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  const hasAccess = roles.some((role) => allowedRoles?.includes(role));

  return hasAccess ? (
    <Outlet />
  ) : (
    <Navigate to='/unauthorized' state={{ from: location }} replace />
  );
};

export default RequireAuth;
