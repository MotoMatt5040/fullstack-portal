import { apiSlice } from '../app/api/apiSlice';

export const resetPasswordApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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

export const { useVerifyResetTokenQuery, useResetPasswordMutation } = resetPasswordApiSlice;