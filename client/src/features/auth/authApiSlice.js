import { apiSlice } from "../../app/api/apiSlice";

export const authApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: "/auth",
                method: "POST",
                body: { ...credentials },
            }),
        }),
        resetPassword: builder.mutation({
            query: (email) => ({
                url: "/reset/reset-password",
                method: "POST",
                body: { ...email },
            }),
        }),
    }),
});

export const { useLoginMutation, useResetPasswordMutation } = authApiSlice;