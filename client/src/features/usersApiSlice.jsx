import React from 'react';
import { apiSlice } from '../app/api/apiSlice';

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET all users - Added providesTags for automatic refetching
    getUsers: builder.query({
      query: () => '/users',
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Users', id })), { type: 'Users', id: 'LIST' }]
          : [{ type: 'Users', id: 'LIST' }],
      // keepUnusedDataFor is fine, but tags are more robust
    }),

    // ADD new user - Added invalidatesTags to trigger a refetch of the user list
    addUser: builder.mutation({
      query: (userData) => ({
        url: '/users/adduser',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),

    // GET all clients (no change needed here)
    getClients: builder.query({
      query: () => ({
        url: '/users/getclients',
        method: 'GET',
      }),
    }),
    
    // --- REPLACED aaddUserRoles and removeUserRoles with this single mutation ---
    // This simplifies the frontend logic immensely.
    updateUserRoles: builder.mutation({
      query: ({ email, roles }) => ({
        url: '/users/roles', // Using the new PUT endpoint
        method: 'PUT',
        body: { email, roles }, // 'roles' is the complete array of role IDs
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Users', id: 'LIST' }],
    }),
    
    // UPDATE a user's profile (like their client)
    updateUserProfile: builder.mutation({
      query: (credentials) => ({
        url: '/users/profile',
        method: 'PUT',
        body: { ...credentials }, // Body will be { email, clientId }
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Users', id: 'LIST' }],
    }),

  }),
});

// Export the updated hooks
export const {
  useGetUsersQuery,
  useAddUserMutation,
  useGetClientsQuery,
  useUpdateUserRolesMutation, 
  useUpdateUserProfileMutation,
} = usersApiSlice;