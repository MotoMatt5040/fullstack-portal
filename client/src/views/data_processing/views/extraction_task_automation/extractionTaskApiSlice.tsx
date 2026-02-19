import { apiSlice } from '../../../../app/api/apiSlice';

interface UploadExtractionFileResponse {
  success: boolean;
  message: string;
}

export const extractionTaskApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    uploadExtractionFile: builder.mutation<
      UploadExtractionFileResponse,
      FormData
    >({
      query: (formData) => ({
        url: '/extraction-task/upload',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const { useUploadExtractionFileMutation } = extractionTaskApiSlice;
