// client/src/app/api/apiSlice.jsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logOut } from '../../features/auth/authSlice';

const BASE_URL = '/api';

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Mutex to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

const refreshToken = async (api, extraOptions) => {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshResult = await baseQuery(
        { url: '/refresh', method: 'GET' },
        api,
        extraOptions
      );

      if (refreshResult?.data?.accessToken) {
        const user = api.getState().auth.user;
        api.dispatch(setCredentials({ accessToken: refreshResult.data.accessToken, user }));
        return { success: true };
      }
      return { success: false, error: refreshResult?.error };
    } catch (error) {
      return { success: false, error };
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 (no auth) - redirect to login
  if (result?.error?.status === 401) {
    api.dispatch(logOut());
    return result;
  }

  // Handle 403 (token expired or invalid)
  if (result?.error?.status === 403) {
    const errorCode = result?.error?.data?.code;

    // Only attempt refresh for expired tokens
    if (errorCode === 'TOKEN_EXPIRED') {
      // Check if persist is enabled
      const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=');
        acc[name] = value;
        return acc;
      }, {});

      const persist = cookies.persist === 'true';

      if (!persist) {
        api.dispatch(logOut());
        return result;
      }

      // Attempt to refresh the token
      const refreshResult = await refreshToken(api, extraOptions);

      if (refreshResult.success) {
        // Retry the original request with the new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logOut());
      }
    } else {
      // For other 403 errors (invalid token, malformed), log out
      api.dispatch(logOut());
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Project', 'CallID', 'Quota'],
  endpoints: (builder) => ({}),
});
