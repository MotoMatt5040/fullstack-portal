import React from 'react';
import { apiSlice } from '../../app/api/apiSlice';

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/users',
      providesTags: (result, error, arg) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Users', id })), { type: 'Users', id: 'LIST' }]
          : [{ type: 'Users', id: 'LIST' }],
    }),
    addUser: builder.mutation({
      query: (userData) => ({
        url: '/users/adduser',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),

    deleteUser: builder.mutation({
      query: (email) => ({
        url: `/users/${email}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, email) => [{ type: 'User', id: email }],
    }),
    getClients: builder.query({
      query: () => ({
        url: '/users/getclients',
        method: 'GET',
      }),
    }),
    updateUserRoles: builder.mutation({
      query: ({ email, roles }) => ({
        url: '/users/roles',
        method: 'PUT',
        body: { email, roles }, 
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Users', id: 'LIST' }],
    }),
    updateUserProfile: builder.mutation({
      query: (credentials) => ({
        url: '/users/profile',
        method: 'PUT',
        body: { ...credentials }, 
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Users', id: 'LIST' }],
    }),

  }),
});

export const {
  useGetUsersQuery,
  useAddUserMutation,
  useGetClientsQuery,
  useUpdateUserRolesMutation, 
  useUpdateUserProfileMutation,
  useDeleteUserMutation
} = usersApiSlice;