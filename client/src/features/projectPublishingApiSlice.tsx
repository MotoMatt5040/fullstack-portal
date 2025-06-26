import { apiSlice } from '../app/api/apiSlice';

interface PublishedProject {
  uuid: string;
  email: string;
  projectid: string;
  clientid: number;
  clientname: string;
}

type PublishedProjectsResponse = PublishedProject[];

export const projectPublishingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublishedProjects: builder.query<PublishedProjectsResponse, void>({
      query: () => ({
        url: '/project-publishing',
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetPublishedProjectsQuery } = projectPublishingApiSlice;