import { apiSlice } from '../../app/api/apiSlice';

export const configApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        // Define the query endpoint for fetching roles
        getRoles: builder.query({
            query: () => '/roles', // The endpoint URL, relative to your BASE_URL
            // We can add a providesTags if we ever want to invalidate this cache,
            // but for roles that rarely change, it's often not needed.
        })
    })
});

// RTK Query automatically generates a hook for this endpoint
export const {
    useGetRolesQuery
} = configApiSlice;