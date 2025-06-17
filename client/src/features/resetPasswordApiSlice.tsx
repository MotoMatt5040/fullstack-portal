import { apiSlice } from '../app/api/apiSlice';

export const resetPasswordApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    forgotPassword: builder.mutation({
      query: ({ email }) => ({
        url: '/reset/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, email, newPassword }) => ({
        url: '/reset/reset-password', // Updated to use /reset
        method: 'POST',
        body: { token, email, newPassword },
      }),
    }),
    verifyResetToken: builder.query({
      query: ({ token, email }) => ({
        url: `/reset/verify-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, // Updated to use /reset
        method: 'GET',
      }),
    }),
  }),
});

export const { useForgotPasswordMutation, useVerifyResetTokenQuery, useResetPasswordMutation } = resetPasswordApiSlice;