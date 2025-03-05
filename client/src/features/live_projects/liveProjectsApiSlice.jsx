import { apiSlice } from "../../app/api/apiSlice";

export const liveProjectsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      getLiveProjects: builder.query({
        query: ({ projectid, recdate }) => ({
          url: `/tables?projectid=${projectid}&recdate=${recdate}`,
          method: 'GET',
        }),
      }),
    }),
  });

  export const { useGetLiveProjectsQuery, useLazyGetLiveProjectsQuery } = liveProjectsApiSlice;
