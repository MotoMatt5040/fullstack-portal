import { apiSlice } from '../app/api/apiSlice';

// TypeScript interfaces for type safety
interface ProcessFileResponse {
  success: boolean;
  sessionId: string;
  headers: Array<{ name: string; type: string }>;
  tableName: string;
  rowsInserted: number;
  totalRows: number;
  message: string;
  fileType?: string;
  originalFilename?: string;
}

export const sampleAutomationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Process file by uploading FormData
    processFile: builder.mutation<ProcessFileResponse, FormData>({
      query: (formData) => ({
        url: '/sample-automation/process',
        method: 'POST',
        body: formData, // Don't set Content-Type - let browser set it with boundary
      }),
    }),
    getClients: builder.query({
      query: () => ({
        url: '/sample-automation/clients',
        method: 'GET',
      }),
      providesTags: ['SampleAutomationClients'],
    }),
    
    // Get vendors from FAJITA database
    getVendors: builder.query({
      query: () => ({
        url: '/sample-automation/vendors',
        method: 'GET',
      }),
      providesTags: ['SampleAutomationVendors'],
    }),
    
    // Get both clients and vendors in one call (more efficient)
    getClientsAndVendors: builder.query({
      query: () => ({
        url: '/sample-automation/clients-and-vendors',
        method: 'GET',
      }),
      providesTags: ['SampleAutomationClients', 'SampleAutomationVendors'],
    }),
  }),
});

// Export hooks for use in components
export const {
  useProcessFileMutation,
  useGetClientsQuery,
  useGetVendorsQuery,
  useGetClientsAndVendorsQuery,
  useLazyGetClientsQuery,
  useLazyGetVendorsQuery,
  useLazyGetClientsAndVendorsQuery,
} = sampleAutomationApiSlice;