import React from 'react';
import { apiSlice } from '../app/api/apiSlice';

export const usersApiSlice = apiSlice.injectEndpoints({
	endpoints: (builder) => ({
		getUsers: builder.query({
			query: () => '/users',
			keepUnusedDataFor: 5,
		}),
		addUserRoles: builder.mutation({
			query: ({ email, roles }) => ({
				url: '/users/updateUserRoles',
				method: 'POST',
				body: { email, roles },
			}),
		}),
		removeUserRoles: builder.mutation({
			query: ({ email, roles }) => ({
				url: '/users/updateUserRoles',
				method: 'DELETE',
				body: { email, roles },
			}),
		}),
		addUser: builder.mutation({
			query: ({
				email,
				password,
				external,
				roles,
				directorId,
				clientId,
			}) => ({
				url: '/users/adduser',
				method: 'POST',
				body: {
					email,
					password,
					external,
					roles,
					directorId,
					clientId,
				},
			}),
		}),
		getClients: builder.query({
			query: () => ({
				url: '/users/getclients',
				method: 'GET',
			}),
		}),
		// getPartners: builder.query({
		// 	query: (clientId) => ({
		// 		url: `/users/getpartners?clientId=${clientId}`,
		// 		method: 'GET',
		// 	}),
		// }),
	}),
});

export const {
	useGetUsersQuery,
	useAddUserRolesMutation,
	useRemoveUserRolesMutation,
	useAddUserMutation,
	useGetClientsQuery,
	// useLazyGetPartnersQuery,
} = usersApiSlice;
