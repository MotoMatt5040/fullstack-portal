import { apiSlice } from "../../app/api/apiSlice";

export const liveProjectsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      getLiveProjectData: builder.query({
        query: ({ projectid, location }) => ({
          url: `/live_data/get_live_project_data?projectid=${projectid}&location=${location}`,
          method: 'GET',
        }),
      }),
      getLiveProjects: builder.query({
        query: ({ projectid, location }) => ({
          url: `/live_data/get_live_projects?projectid=${projectid}&location=${location}`,
          method: 'GET',
        }),
      })
    }),
  });

  export const { useGetLiveProjectDataQuery, useGetLiveProjectsQuery } = liveProjectsApiSlice;
