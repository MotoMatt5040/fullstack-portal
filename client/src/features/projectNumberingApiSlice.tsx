import { apiSlice } from '../app/api/apiSlice';

export const projectNumberingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all projects with pagination and search
    getProjectsNumbering: builder.query({
      query: ({ page = 1, limit = 75, sortBy = 'projectID', sortOrder = 'DESC', search = '' }) => ({
        url: `/project-numbering?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${search}`,
        method: 'GET',
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.projects.map(({ projectID }) => ({ type: 'Project', id: projectID })),
              { type: 'Project', id: 'LIST' },
            ]
          : [{ type: 'Project', id: 'LIST' }],
    }),

    // Get next project number
    getNextProjectNumber: builder.query({
      query: () => '/project-numbering/next-number',
    }),

    // Get a single project by ID
    getProjectByNumber: builder.query({
      query: (projectID) => `/project-numbering/${projectID}`,
      providesTags: (result, error, projectID) => [{ type: 'Project', id: projectID }],
    }),

    // Create a new project
    createProject: builder.mutation({
      query: (projectData) => ({
        url: '/project-numbering',
        method: 'POST',
        body: projectData,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    // Update a project
    updateProject: builder.mutation({
      query: ({ projectID, ...projectData }) => ({
        url: `/project-numbering/${projectID}`,
        method: 'PUT',
        body: projectData,
      }),
      invalidatesTags: (result, error, { projectID }) => [
        { type: 'Project', id: projectID },
        { type: 'Project', id: 'LIST' },
      ],
    }),

    // Delete a project
    deleteProject: builder.mutation({
      query: (projectID) => ({
        url: `/project-numbering/${projectID}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    // Search projects
    searchProjects: builder.mutation({
      query: (searchCriteria) => ({
        url: '/project-numbering/search',
        method: 'POST',
        body: searchCriteria,
      }),
    }),

    // Get project statistics
    getProjectStats: builder.query({
      query: () => '/project-numbering/stats',
      providesTags: ['ProjectStats'],
    }),
  }),
});

export const {
  useGetProjectsNumberingQuery,
  useLazyGetProjectsNumberingQuery,
  useGetNextProjectNumberQuery,
  useGetProjectByNumberQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useSearchProjectsMutation,
  useGetProjectStatsQuery,
} = projectNumberingApiSlice;