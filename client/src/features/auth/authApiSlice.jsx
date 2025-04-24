import { apiSlice } from "../../app/api/apiSlice";

export const authApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: "/auth/login",
                method: "POST",
                body: { ...credentials },
            }),
        }),
        logout: builder.mutation({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
            }),
        }),
        resetPassword: builder.mutation({
            query: (email) => ({
                url: "/reset/reset-password",
                method: "POST",
                body: { ...email },
            }),
        }),
        protectLink: builder.query({
            query: () => ({
                url: "/refresh",
                method: "GET",
            }),
        })
    }),
});

export const { useLoginMutation, useLogoutMutation, useResetPasswordMutation, useProtectLinkQuery } = authApiSlice;