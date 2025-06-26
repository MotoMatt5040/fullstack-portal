import { apiSlice } from '../app/api/apiSlice';

interface PublishedProject {
  uuid: string;
  email: string;
  projectid: string;
  clientid: number;
  clientname: string;
}

interface Project {
  projectId: string;
  projectName: string;
}

interface Client {
    clientId: string;
    clientName: string;
}

type PublishedProjectsResponse = PublishedProject[];
type ProjectsResponse = Project[];
type ClientsResponse = Client[];


export const projectPublishingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublishedProjects: builder.query<PublishedProjectsResponse, void>({
      query: () => ({
        url: '/project-publishing',
        method: 'GET',
      }),
    }),
    getProjects: builder.query<ProjectsResponse, void>({
        query: () => ({
            url: '/project-publishing/projects',
            method: 'GET',
        }),
    }),
    getClients: builder.query<ClientsResponse, void>({
        query: () => ({
            url: '/project-publishing/clients',
            method: 'GET',
        }),
    }),
  }),
});

export const { useGetPublishedProjectsQuery, useGetProjectsQuery, useGetClientsQuery } = projectPublishingApiSlice;