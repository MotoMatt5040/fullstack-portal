import React from "react";
import { apiSlice } from "../../app/api/apiSlice"

export const usersApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getUsers: builder.query({
            query: () => '/users',
            keepUnusedDataFor: 5,
        }),
        addUserRoles: builder.mutation({
            query: ({ email, roles }) => ({
                url: '/users/updateUserRoles',
                method: 'POST',
                body: { email, roles }
            })
        }),
        removeUserRoles: builder.mutation({
            query: ({ email, roles }) => ({
                url: '/users/updateUserRoles',
                method: 'DELETE',
                body: { email, roles }
            })
        })
    })
})

export const {
    useGetUsersQuery,
    useAddUserRolesMutation,
    useRemoveUserRolesMutation
} = usersApiSlice 