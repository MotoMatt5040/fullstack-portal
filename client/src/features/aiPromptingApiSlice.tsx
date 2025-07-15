import { apiSlice } from '../app/api/apiSlice';

interface AiPromptRequestBody {
  model: string | null;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
}

export const aiPromptingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChatModels: builder.query<string[], void>({
      query: () => ({
        url: '/ai-prompting/models',
        method: 'GET',
      }),
    }),
    getAiResponse: builder.mutation<string, AiPromptRequestBody>({
      query: (promptData) => ({
        url: '/ai-prompting/response',
        method: 'POST',
        body: promptData, 
        responseHandler: (response) => response.text(),
      }),
    }),
  }),
});

export const { useGetChatModelsQuery, useGetAiResponseMutation } = aiPromptingApiSlice;