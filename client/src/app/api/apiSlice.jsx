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
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Expires', '0');

    return headers;
  },
});

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  console.log('🔵 Making API request:', args);
  let result = await baseQuery(args, api, extraOptions);

  // Handle 403 (your verifyJWT returns 403 for expired tokens)
  if (result?.error?.status === 403) {
    console.log('⚠️ Received 403 error - token likely expired');
    console.log('📋 Error details:', result.error);

    // Check if persist is enabled
    const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
      const [name, value] = cookie.split('=');
      acc[name] = value;
      return acc;
    }, {});

    const persist = cookies.persist === 'true';
    console.log('🔐 Persist enabled:', persist);

    if (!persist) {
      console.log('❌ Persist not enabled - logging out');
      api.dispatch(logOut());
      return result;
    }

    // Attempt to refresh the token
    console.log('🔄 Attempting to refresh token...');
    const refreshResult = await baseQuery('/refresh', api, extraOptions);
    console.log('📥 Refresh result:', refreshResult);

    if (refreshResult?.data?.accessToken) {
      console.log('✅ Token refresh successful!');
      const user = api.getState().auth.user;

      // Store the new token
      api.dispatch(setCredentials({ ...refreshResult.data, user }));
      console.log('💾 New token stored in Redux');

      // Retry the original request with the new token
      console.log('🔁 Retrying original request...');
      result = await baseQuery(args, api, extraOptions);

      if (result?.error) {
        console.log('❌ Retry failed:', result.error);
      } else {
        console.log('✅ Retry successful!');
      }
    } else {
      console.log('❌ Token refresh failed - no accessToken in response');
      console.log('📋 Refresh response:', refreshResult);
      api.dispatch(logOut());
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({}),
});
