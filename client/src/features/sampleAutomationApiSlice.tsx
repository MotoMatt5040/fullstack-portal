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

interface Client {
  ClientID: number;
  ClientName: string;
}

interface Vendor {
  VendorID: number;
  VendorName: string;
}

interface ClientsAndVendorsResponse {
  clients: Client[];
  vendors: Vendor[];
}

// New interfaces for header mapping
interface HeaderMapping {
  original: string;
  mapped: string;
  vendorName?: string;
  clientName?: string;
  vendorId?: number;
  clientId?: number;
  priority?: number;
}

interface HeaderMappingsResponse {
  success: boolean;
  data: Record<string, HeaderMapping>;
  message: string;
}

interface HeaderMappingsParams {
  vendorId?: number | null;
  clientId?: number | null;
  originalHeaders: string[];
}

interface SaveHeaderMappingsParams {
  vendorId?: number | null;
  clientId?: number | null;
  mappings: Array<{
    original: string;
    mapped: string;
  }>;
}

interface SaveHeaderMappingsResponse {
  success: boolean;
  savedCount: number;
  message: string;
}

interface TableColumn {
  name: string;
  type: string;
}

interface TablePreviewResponse {
  success: boolean;
  tableName: string;
  columns: TableColumn[];
  data: Record<string, any>[];
  rowCount: number;
  message: string;
}

interface TablePreviewParams {
  tableName: string;
  limit?: number;
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

    // Get clients from CaligulaD database
    getClients: builder.query<Client[], void>({
      query: () => ({
        url: '/sample-automation/clients',
        method: 'GET',
      }),
      providesTags: ['SampleAutomationClients'],
    }),

    // Get vendors from FAJITA database
    getVendors: builder.query<Vendor[], void>({
      query: () => ({
        url: '/sample-automation/vendors',
        method: 'GET',
      }),
      providesTags: ['SampleAutomationVendors'],
    }),

    // Get both clients and vendors in one call (more efficient)
    getClientsAndVendors: builder.query<ClientsAndVendorsResponse, void>({
      query: () => ({
        url: '/sample-automation/clients-and-vendors',
        method: 'GET',
      }),
      providesTags: ['SampleAutomationClients', 'SampleAutomationVendors'],
    }),

    detectHeaders: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/sample-automation/detect-headers',
          method: 'POST',
          body: formData,
        };
      },
    }),

    // NEW: Get header mappings based on vendor/client and original headers
    getHeaderMappings: builder.query<
      HeaderMappingsResponse,
      HeaderMappingsParams
    >({
      query: ({ vendorId, clientId, originalHeaders }) => {
        const params = new URLSearchParams();

        if (vendorId !== null && vendorId !== undefined) {
          params.append('vendorId', vendorId.toString());
        }
        if (clientId !== null && clientId !== undefined) {
          params.append('clientId', clientId.toString());
        }
        params.append('originalHeaders', JSON.stringify(originalHeaders));

        return {
          url: `/sample-automation/header-mappings?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { vendorId, clientId }) => [
        'HeaderMappings',
        {
          type: 'HeaderMappings',
          id: `${vendorId || 'null'}-${clientId || 'null'}`,
        },
      ],
    }),

    // NEW: Save header mappings to database (when user edits mappings)
    saveHeaderMappings: builder.mutation<
      SaveHeaderMappingsResponse,
      SaveHeaderMappingsParams
    >({
      query: (params) => ({
        url: '/sample-automation/header-mappings',
        method: 'POST',
        body: params,
      }),
      invalidatesTags: (result, error, { vendorId, clientId }) => [
        'HeaderMappings',
        {
          type: 'HeaderMappings',
          id: `${vendorId || 'null'}-${clientId || 'null'}`,
        },
      ],
    }),
    // Get table preview (top N rows)
    getTablePreview: builder.query<TablePreviewResponse, TablePreviewParams>({
      query: ({ tableName, limit = 10 }) => ({
        url: `/sample-automation/table-preview/${tableName}?limit=${limit}`,
        method: 'GET',
      }),
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
  // NEW: Header mapping hooks
  useGetHeaderMappingsQuery,
  useLazyGetHeaderMappingsQuery,
  useSaveHeaderMappingsMutation,
  useDetectHeadersMutation,
  useLazyGetTablePreviewQuery,
} = sampleAutomationApiSlice;
