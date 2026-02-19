import { apiSlice } from '../../app/api/apiSlice';

export const ProjectInfoApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjectList: builder.query({
      query: ({ userId }) => ({
        url: `/project-info/projects?userId=${userId}`,
        method: 'GET',
      }),
    })
  }),
});

export const { useGetProjectListQuery, useLazyGetProjectListQuery } = ProjectInfoApiSlice;


