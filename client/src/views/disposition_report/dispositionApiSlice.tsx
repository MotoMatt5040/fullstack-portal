// features/dispositionApiSlice.ts
import { apiSlice } from '../../app/api/apiSlice';

export const dispositionApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWebDisposition: builder.query({
      query: ({ projectId, isInternalUser }) => ({
        url: `/disposition-report/web/${projectId}`,
        params: {
          internal: isInternalUser,
        },
      }),
      providesTags: (result, error, { projectId }) => [
        { type: 'Disposition', id: `web-${projectId}` },
      ],
    }),
    getWebDropoutCounts: builder.query({
      query: ({ projectId }) => ({
        url: `/disposition-report/web/${projectId}/counts`
      })
    }),
    getPhoneDisposition: builder.query({
      query: ({ projectId, isInternalUser }) => ({
        url: `/disposition-report/phone/${projectId}`,
        params: {
          internal: isInternalUser,
        },
      }),
      providesTags: (result, error, { projectId }) => [
        { type: 'Disposition', id: `phone-${projectId}` },
      ],
    }),
    getBothDispositions: builder.query({
      query: ({ projectId, isInternalUser }) => ({
        url: `/disposition-report/combined/${projectId}`,
        params: {
          internal: isInternalUser,
        },
      }),
      providesTags: (result, error, { projectId }) => [
        { type: 'Disposition', id: `combined-${projectId}` },
      ],
    }),
  }),
});

export const {
  useLazyGetWebDispositionQuery,
  useLazyGetWebDropoutCountsQuery,
  useLazyGetPhoneDispositionQuery,
  useLazyGetBothDispositionsQuery,
  useGetWebDispositionQuery,
  useGetPhoneDispositionQuery,
  useGetBothDispositionsQuery,
} = dispositionApiSlice;