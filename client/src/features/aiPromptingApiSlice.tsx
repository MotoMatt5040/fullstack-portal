import { apiSlice } from '../app/api/apiSlice';

export const aiPromptingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChatModels: builder.query<string[], void>({
      query: () => ({
        url: '/ai-prompting/models',
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetChatModelsQuery } = aiPromptingApiSlice;