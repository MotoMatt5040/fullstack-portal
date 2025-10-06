import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logOut } from '../../features/auth/authSlice';

// let BASE_URL;

// if (import.meta.env.VITE_ENV === 'dev') {
//   BASE_URL = import.meta.env.VITE_DEV_API_URL;
// } else {
//   BASE_URL = `https://api.${import.meta.env.VITE_DOMAIN_NAME}`;
// }

const BASE_URL = '/api';

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Expires', '0');
    
    return headers;
  },
});

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 403) {
    // Check if the trust this device box was checked. We want to log out if the device is not trusted.
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

    // send refresh token to get new access token
    const refreshResult = await baseQuery('/refresh', api, extraOptions);
    if (refreshResult?.data) {
      console.log('🔍 Refresh result:', refreshResult);
      const user = api.getState().auth.user;
      // store the new token
      api.dispatch(setCredentials({ ...refreshResult.data, user }));
      // retry the original query with new access token
      console.log('❌ Refresh failed, logging out. Result was:', refreshResult); 
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logOut());
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({}),
});
