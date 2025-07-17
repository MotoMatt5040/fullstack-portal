import { apiSlice } from '../app/api/apiSlice';

interface AiPromptRequestBody {
  model: string | null;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
}

interface AddAiPromptBody {
  projectId: string;
  questionNumber: string;
  questionSummary: string;
  tone: string;
  prompt: string;
  email: string;
}

interface UpdateDefaultPromptBody {
  tone: string;
  prompt: string;
  email: string;
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
    getAiPrompts: builder.query<any[], { projectId: string; questionNumber: string }>({
      query: ({ projectId, questionNumber }) => ({
        url: `/ai-prompting/prompts?projectId=${projectId}&questionNumber=${questionNumber}`,
        method: 'GET',
        responseHandler: (response) => response.json(),
      }),
      providesTags: ['AiPrompts'],
    }),
    addAiPrompt: builder.mutation<any, AddAiPromptBody>({
      query: ({ projectId, questionNumber, questionSummary, tone, prompt, email }) => ({
        url: '/ai-prompting/prompts',
        method: 'POST',
        body: { projectId, questionNumber, questionSummary, tone, prompt, email },
        responseHandler: (response) => response.json(),
      }),
      invalidatesTags: ['AiPrompts'],
    }),
    getDefaultPrompt: builder.query<any, void>({
      query: () => ({
        url: '/ai-prompting/default-prompt',
        method: 'GET',
        responseHandler: (response) => response.json(),
      }),
      providesTags: ['DefaultPrompt'],
    }),
    updateDefaultPrompt: builder.mutation<any, UpdateDefaultPromptBody>({
      query: ({ tone, prompt, email }) => ({
        url: '/ai-prompting/default-prompt',
        method: 'POST',
        body: { tone, prompt, email },
        responseHandler: (response) => response.json(),
      }),
      invalidatesTags: ['DefaultPrompt'],
    }),
  }),
});

export const {
  useGetChatModelsQuery,
  useGetAiResponseMutation,
  useGetAiPromptsQuery,
  useAddAiPromptMutation,
  useGetDefaultPromptQuery,
  useUpdateDefaultPromptMutation,
} = aiPromptingApiSlice;