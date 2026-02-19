import { apiSlice } from '../../app/api/apiSlice';

// TypeScript interfaces for type safety
interface CallIdAssignment {
  success: boolean;
  message?: string;
  assigned?: Array<{
    slotName: string;
    phoneNumberId: number;
    phoneNumber: string;
    areaCode: string;
    stateAbbr: string;
  }>;
  areaCodes?: Array<{ areaCode: string; count: number }>;
}

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
  distinctAgeRanges?: number[];
  callIdAssignment?: CallIdAssignment;
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

// Header Mappings Management interfaces
interface AllHeaderMapping {
  originalHeader: string;
  mappedHeader: string;
  vendorId: number | null;
  clientId: number | null;
  vendorName: string;
  clientName: string;
  createdDate: string;
  modifiedDate: string | null;
}

interface GetAllHeaderMappingsParams {
  vendorId?: number;
  clientId?: number;
  search?: string;
}

interface GetAllHeaderMappingsResponse {
  success: boolean;
  data: AllHeaderMapping[];
  count: number;
  message: string;
}

interface DeleteHeaderMappingParams {
  originalHeader: string;
  vendorId: number | null;
  clientId: number | null;
}

interface DeleteHeaderMappingResponse {
  success: boolean;
  message: string;
}

// Variable Exclusions interfaces
interface VariableExclusion {
  exclusionId: number;
  variableName: string;
  description: string | null;
  createdDate: string;
  createdBy: string | null;
}

interface GetVariableExclusionsParams {
  search?: string;
}

interface GetVariableExclusionsResponse {
  success: boolean;
  data: VariableExclusion[];
}

interface AddVariableExclusionParams {
  variableName: string;
  description?: string;
}

interface AddVariableExclusionResponse {
  success: boolean;
  data: VariableExclusion;
}

interface UpdateVariableExclusionParams {
  exclusionId: number;
  description?: string;
}

interface UpdateVariableExclusionResponse {
  success: boolean;
  data: VariableExclusion;
}

interface DeleteVariableExclusionResponse {
  success: boolean;
  deleted: boolean;
  rowsAffected: number;
}

// Project Variable Inclusions interfaces
interface ProjectVariableInclusion {
  inclusionId: number;
  projectId: number;
  originalVariableName: string;
  mappedVariableName: string;
  createdDate: string;
  createdBy: string | null;
}

interface GetProjectVariableInclusionsResponse {
  success: boolean;
  data: ProjectVariableInclusion[];
}

interface AddProjectVariableInclusionParams {
  projectId: number;
  originalVariableName: string;
  mappedVariableName: string;
}

interface AddProjectVariableInclusionResponse {
  success: boolean;
  data: ProjectVariableInclusion;
}

interface UpdateProjectVariableInclusionParams {
  inclusionId: number;
  mappedVariableName: string;
}

interface UpdateProjectVariableInclusionResponse {
  success: boolean;
  data: ProjectVariableInclusion;
}

interface DeleteProjectVariableInclusionResponse {
  success: boolean;
  deleted: boolean;
  rowsAffected: number;
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

interface CreateDNCScrubbedParams {  // ✅ Fixed
  tableName: string;
}

interface CreateDNCScrubbedResponse {  // ✅ Fixed
  success: boolean;
  sourceTableName: string;
  newTableName: string;
  phoneColumnsChecked: string[];
  rowsOriginal: number;
  rowsClean: number;
  rowsRemoved: number;
  message: string;
}

// Add this interface near your other interfaces:
interface GetDistinctAgeRangesParams {
  tableName: string;
}

interface GetDistinctAgeRangesResponse {
  success: boolean;
  ageRanges: string[];
  count: number;
  message?: string;
}

interface ExtractFilesParams {
  tableName: string;
  selectedHeaders: string[];
  splitMode: string;
  selectedAgeRange?: string | number;
  householdingEnabled?: boolean;
  clientId?: number | null;
  fileNames: {
    landline?: string;
    cell?: string;
    single?: string;
  };
}

interface ExtractFilesResponse {
  success: boolean;
  splitMode: string;
  vtypeUpdated?: boolean;
  householdingProcessed?: boolean; 
  vtypeStats?: {
    landlineCount: number;
    cellCount: number;
    ageThreshold: number;
  };
  householdingStats?: HouseholdingStats | null; 
  householdingDuplicateFiles?: HouseholdingDuplicateFiles | null; 
  files: {
    landline?: {
      filename: string;
      path: string;
      url: string;
      records: number;
      headers?: string[];
      conditions: string[];
    };
    cell?: {
      filename: string;
      path: string;
      url: string;
      records: number;
      headers?: string[];
      conditions: string[];
    };
    single?: {
      filename: string;
      path: string;
      url: string;
      records: number;
      headers?: string[];
      conditions?: string[];
    };
    duplicate2?: HouseholdingDuplicateFile;
    duplicate3?: HouseholdingDuplicateFile;
    duplicate4?: HouseholdingDuplicateFile;
  };
  message: string;
}

// Add cleanup interface
interface CleanupTempFileResponse {
  success: boolean;
  message: string;
}

// NEW: Add interfaces for householding duplicate files
interface HouseholdingDuplicateFile {
  filename: string;
  path: string;
  url: string;
  records: number;
  headers: string[];
  rank: number;
  description: string;
}

interface HouseholdingDuplicateFiles {
  filesGenerated: number;
  totalRecords: number;
  files: {
    duplicate2?: HouseholdingDuplicateFile;
    duplicate3?: HouseholdingDuplicateFile;
    duplicate4?: HouseholdingDuplicateFile;
  };
  message: string;
  success: boolean;
}

interface HouseholdingStats {
  totalProcessed: number;
  mainTableFinalCount: number;
  duplicateCounts: {
    duplicate2: number;
    duplicate3: number;
    duplicate4: number;
  };
  tablesCreated: {
    backup: string;
    duplicate2: string;
    duplicate3: string;
    duplicate4: string;
  };
  message: string;
}

// ============================================================================
// COMPUTED VARIABLES INTERFACES
// ============================================================================

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'is_empty'
  | 'is_not_empty';

export type OutputDataType = 'INT' | 'TEXT' | 'CHAR' | 'VARCHAR';

export interface Condition {
  id: string;
  variable: string;
  operator: ConditionOperator;
  value: string | number;
}

export interface ComputedRule {
  id: string;
  conditions: Condition[];
  conditionLogic: 'AND' | 'OR';
  outputValue: string | number;
}

export interface ComputedVariableDefinition {
  id: string;
  name: string;
  outputType: OutputDataType;
  outputLength?: number;
  rules: ComputedRule[];
  defaultValue: string | number;
  formula?: string;
  inputMode: 'visual' | 'formula';
}

interface PreviewComputedVariableParams {
  tableName: string;
  variableDefinition: ComputedVariableDefinition;
}

interface PreviewComputedVariableResponse {
  success: boolean;
  sampleData: Record<string, any>[];
  estimatedLength: number;
  columnName: string;
  errors: string[];
}

interface AddComputedVariableParams {
  tableName: string;
  variableDefinition: ComputedVariableDefinition;
}

interface AddComputedVariableResponse {
  success: boolean;
  message: string;
  newColumnName: string;
  rowsUpdated: number;
  executionTimeMs: number;
}

interface RemoveComputedVariableParams {
  tableName: string;
  columnName: string;
}

interface RemoveComputedVariableResponse {
  success: boolean;
  message: string;
  columnName: string;
}

// ============================================================================
// EXTRACTION DEFAULTS INTERFACES
// ============================================================================

export interface ExtractionVariable {
  variableName: string;
  source?: 'Project' | 'VendorClient' | 'Client';
}

export interface ExtractionDefault {
  id: number;
  variableName: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface ExtractionOverride extends ExtractionDefault {
  clientId: number;
  vendorId: number | null;
}

interface GetExtractionVariablesParams {
  clientId: number;
  vendorId?: number | null;
  projectId?: number | null;
}

interface GetExtractionVariablesResponse {
  success: boolean;
  variables: ExtractionVariable[];
}

interface GetMasterExtractionDefaultsResponse {
  success: boolean;
  defaults: ExtractionDefault[];
}

interface GetClientExtractionDefaultsResponse {
  success: boolean;
  defaults: ExtractionDefault[];
}

interface GetVendorClientExtractionDefaultsResponse {
  success: boolean;
  defaults: ExtractionDefault[];
}

interface GetProjectExtractionOverridesResponse {
  success: boolean;
  overrides: ExtractionOverride[];
}

interface SaveExtractionDefaultsParams {
  variables: Array<{ variableName: string }>;
}

interface SaveExtractionDefaultsResponse {
  success: boolean;
  added: number;
  deleted: number;
}

interface SaveProjectOverridesParams {
  clientId: number;
  vendorId?: number | null;
  variables: Array<{ variableName: string }>;
}

interface DeleteExtractionDefaultResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// SAMPLE TRACKING INTERFACES
// ============================================================================

export interface SampleTableParent {
  tableName: string;
  rowCount: number;
  projectId: string | null;
  timestamp: string | null;
  createdDate: Date | null;
}

export interface SampleTableDerivative {
  tableName: string;
  rowCount: number;
  type: string;
}

export interface SampleTableFamily {
  parentTable: SampleTableParent;
  derivatives: SampleTableDerivative[];
}

export interface SampleTableProject {
  projectId: string;
  tables: SampleTableFamily[];
}

interface GetSampleTablesParams {
  projectId?: string;
  limit?: number;
}

interface GetSampleTablesResponse {
  success: boolean;
  data: SampleTableProject[];
  count: number;
}

interface SampleTableColumn {
  name: string;
  dataType: string;
  maxLength: number | null;
  nullable: boolean;
  position: number;
}

interface GetSampleTableDetailsResponse {
  success: boolean;
  data: {
    tableName: string;
    columns: SampleTableColumn[];
    totalRows: number;
    sampleRows: Record<string, any>[];
  };
}

interface DeleteSampleTableParams {
  tableName: string;
  includeDerivatives?: boolean;
}

interface DeleteSampleTableResponse {
  success: boolean;
  deletedTables: string[];
  message: string;
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

    // Create DNC-scrubbed table
createDNCScrubbed: builder.mutation<CreateDNCScrubbedResponse, CreateDNCScrubbedParams>({
  query: (params) => ({
    url: '/sample-automation/create-dnc-scrubbed',
    method: 'POST',
    body: params,
  }),
}),

getDistinctAgeRanges: builder.query<
  GetDistinctAgeRangesResponse,
  GetDistinctAgeRangesParams
>({
  query: ({ tableName }) => ({
    url: `/sample-automation/distinct-age-ranges/${tableName}`,
    method: 'GET',
  }),
}),

extractFiles: builder.mutation<ExtractFilesResponse, ExtractFilesParams>({
  query: (params) => ({
    url: '/sample-automation/extract-files',
    method: 'POST',
    body: params,
  }),
}),

    // NEW: Cleanup temp file after download
    cleanupTempFile: builder.mutation<CleanupTempFileResponse, string>({
      query: (filename) => ({
        url: `/sample-automation/cleanup/${filename}`,
        method: 'DELETE',
      }),
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
        'AllHeaderMappings',
        {
          type: 'HeaderMappings',
          id: `${vendorId || 'null'}-${clientId || 'null'}`,
        },
      ],
    }),

    // Get all header mappings for management page
    getAllHeaderMappings: builder.query<
      GetAllHeaderMappingsResponse,
      GetAllHeaderMappingsParams
    >({
      query: ({ vendorId, clientId, search } = {}) => {
        const params = new URLSearchParams();
        if (vendorId !== undefined) params.append('vendorId', vendorId.toString());
        if (clientId !== undefined) params.append('clientId', clientId.toString());
        if (search) params.append('search', search);
        const queryString = params.toString();
        return {
          url: `/sample-automation/header-mappings/all${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['AllHeaderMappings'],
    }),

    // Delete a header mapping
    deleteHeaderMapping: builder.mutation<
      DeleteHeaderMappingResponse,
      DeleteHeaderMappingParams
    >({
      query: (params) => ({
        url: '/sample-automation/header-mappings',
        method: 'DELETE',
        body: params,
      }),
      invalidatesTags: ['HeaderMappings', 'AllHeaderMappings'],
    }),
    // Get table preview (top N rows)
    getTablePreview: builder.query<TablePreviewResponse, TablePreviewParams>({
      query: ({ tableName, limit = 10 }) => ({
        url: `/sample-automation/table-preview/${tableName}?limit=${limit}`,
        method: 'GET',
      }),
    }),

    // Computed Variables: Preview without applying
    previewComputedVariable: builder.mutation<
      PreviewComputedVariableResponse,
      PreviewComputedVariableParams
    >({
      query: (params) => ({
        url: '/sample-automation/computed-variable/preview',
        method: 'POST',
        body: params,
      }),
    }),

    // Computed Variables: Add to table
    addComputedVariable: builder.mutation<
      AddComputedVariableResponse,
      AddComputedVariableParams
    >({
      query: (params) => ({
        url: '/sample-automation/computed-variable/add',
        method: 'POST',
        body: params,
      }),
    }),

    // Computed Variables: Remove from table
    removeComputedVariable: builder.mutation<
      RemoveComputedVariableResponse,
      RemoveComputedVariableParams
    >({
      query: (params) => ({
        url: '/sample-automation/computed-variable/remove',
        method: 'DELETE',
        body: params,
      }),
    }),

    // ========================================================================
    // EXTRACTION DEFAULTS ENDPOINTS
    // ========================================================================

    // Get resolved extraction variables (uses hierarchy: Project > VendorClient > Client)
    getExtractionVariables: builder.query<
      GetExtractionVariablesResponse,
      GetExtractionVariablesParams
    >({
      query: ({ clientId, vendorId, projectId }) => {
        const params = new URLSearchParams();
        params.append('clientId', clientId.toString());
        if (vendorId !== null && vendorId !== undefined) {
          params.append('vendorId', vendorId.toString());
        }
        if (projectId !== null && projectId !== undefined) {
          params.append('projectId', projectId.toString());
        }
        return {
          url: `/sample-automation/extraction-variables?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['ExtractionDefaults'],
    }),

    // Get master extraction defaults (global defaults for all files)
    getMasterExtractionDefaults: builder.query<
      GetMasterExtractionDefaultsResponse,
      void
    >({
      query: () => ({
        url: '/sample-automation/extraction-defaults/master',
        method: 'GET',
      }),
      providesTags: [{ type: 'ExtractionDefaults', id: 'master' }],
    }),

    // Save master extraction defaults
    saveMasterExtractionDefaults: builder.mutation<
      SaveExtractionDefaultsResponse,
      { variables: SaveExtractionDefaultsParams['variables'] }
    >({
      query: ({ variables }) => ({
        url: '/sample-automation/extraction-defaults/master',
        method: 'PUT',
        body: { variables },
      }),
      invalidatesTags: [
        'ExtractionDefaults',
        { type: 'ExtractionDefaults', id: 'master' },
      ],
    }),

    // Get client-level extraction defaults
    getClientExtractionDefaults: builder.query<
      GetClientExtractionDefaultsResponse,
      number
    >({
      query: (clientId) => ({
        url: `/sample-automation/extraction-defaults/client/${clientId}`,
        method: 'GET',
      }),
      providesTags: (result, error, clientId) => [
        { type: 'ExtractionDefaults', id: `client-${clientId}` },
      ],
    }),

    // Get vendor+client extraction defaults
    getVendorClientExtractionDefaults: builder.query<
      GetVendorClientExtractionDefaultsResponse,
      { vendorId: number; clientId: number }
    >({
      query: ({ vendorId, clientId }) => ({
        url: `/sample-automation/extraction-defaults/vendor/${vendorId}/client/${clientId}`,
        method: 'GET',
      }),
      providesTags: (result, error, { vendorId, clientId }) => [
        { type: 'ExtractionDefaults', id: `vendor-${vendorId}-client-${clientId}` },
      ],
    }),

    // Get project-level extraction overrides
    getProjectExtractionOverrides: builder.query<
      GetProjectExtractionOverridesResponse,
      number
    >({
      query: (projectId) => ({
        url: `/sample-automation/extraction-overrides/project/${projectId}`,
        method: 'GET',
      }),
      providesTags: (result, error, projectId) => [
        { type: 'ExtractionDefaults', id: `project-${projectId}` },
      ],
    }),

    // Save client-level extraction defaults
    saveClientExtractionDefaults: builder.mutation<
      SaveExtractionDefaultsResponse,
      { clientId: number; variables: SaveExtractionDefaultsParams['variables'] }
    >({
      query: ({ clientId, variables }) => ({
        url: `/sample-automation/extraction-defaults/client/${clientId}`,
        method: 'PUT',
        body: { variables },
      }),
      invalidatesTags: (result, error, { clientId }) => [
        'ExtractionDefaults',
        { type: 'ExtractionDefaults', id: `client-${clientId}` },
      ],
    }),

    // Save vendor+client extraction defaults
    saveVendorClientExtractionDefaults: builder.mutation<
      SaveExtractionDefaultsResponse,
      { vendorId: number; clientId: number; variables: SaveExtractionDefaultsParams['variables'] }
    >({
      query: ({ vendorId, clientId, variables }) => ({
        url: `/sample-automation/extraction-defaults/vendor/${vendorId}/client/${clientId}`,
        method: 'PUT',
        body: { variables },
      }),
      invalidatesTags: (result, error, { vendorId, clientId }) => [
        'ExtractionDefaults',
        { type: 'ExtractionDefaults', id: `vendor-${vendorId}-client-${clientId}` },
      ],
    }),

    // Save project-level extraction overrides
    saveProjectExtractionOverrides: builder.mutation<
      SaveExtractionDefaultsResponse,
      SaveProjectOverridesParams & { projectId: number }
    >({
      query: ({ projectId, clientId, vendorId, variables }) => ({
        url: `/sample-automation/extraction-overrides/project/${projectId}`,
        method: 'PUT',
        body: { clientId, vendorId, variables },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        'ExtractionDefaults',
        { type: 'ExtractionDefaults', id: `project-${projectId}` },
      ],
    }),

    // Delete extraction default/override
    deleteExtractionDefault: builder.mutation<
      DeleteExtractionDefaultResponse,
      { type: 'client' | 'vendor-client' | 'project'; id: number }
    >({
      query: ({ type, id }) => ({
        url: `/sample-automation/extraction-defaults/${type}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExtractionDefaults'],
    }),

    // ========================================================================
    // SAMPLE TRACKING ENDPOINTS
    // ========================================================================

    // Get all sample tables with their relationships
    getSampleTables: builder.query<GetSampleTablesResponse, GetSampleTablesParams>({
      query: ({ projectId, limit } = {}) => {
        const params = new URLSearchParams();
        if (projectId) params.append('projectId', projectId);
        if (limit) params.append('limit', limit.toString());
        const queryString = params.toString();
        return {
          url: `/sample-automation/sample-tables${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['SampleTables'],
    }),

    // Get detailed information about a specific sample table
    getSampleTableDetails: builder.query<GetSampleTableDetailsResponse, string>({
      query: (tableName) => ({
        url: `/sample-automation/sample-tables/${encodeURIComponent(tableName)}`,
        method: 'GET',
      }),
      providesTags: (result, error, tableName) => [
        { type: 'SampleTables', id: tableName },
      ],
    }),

    // Delete a sample table and optionally its derivatives
    deleteSampleTable: builder.mutation<DeleteSampleTableResponse, DeleteSampleTableParams>({
      query: ({ tableName, includeDerivatives = true }) => ({
        url: `/sample-automation/sample-tables/${encodeURIComponent(tableName)}`,
        method: 'DELETE',
        body: { includeDerivatives },
      }),
      invalidatesTags: ['SampleTables'],
    }),

    // Variable Exclusions endpoints
    getVariableExclusions: builder.query<GetVariableExclusionsResponse, GetVariableExclusionsParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        const queryString = searchParams.toString();
        return {
          url: `/sample-automation/variable-exclusions${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['VariableExclusions'],
    }),

    addVariableExclusion: builder.mutation<AddVariableExclusionResponse, AddVariableExclusionParams>({
      query: (params) => ({
        url: '/sample-automation/variable-exclusions',
        method: 'POST',
        body: params,
      }),
      invalidatesTags: ['VariableExclusions'],
    }),

    updateVariableExclusion: builder.mutation<UpdateVariableExclusionResponse, UpdateVariableExclusionParams>({
      query: ({ exclusionId, ...body }) => ({
        url: `/sample-automation/variable-exclusions/${exclusionId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['VariableExclusions'],
    }),

    deleteVariableExclusion: builder.mutation<DeleteVariableExclusionResponse, number>({
      query: (exclusionId) => ({
        url: `/sample-automation/variable-exclusions/${exclusionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['VariableExclusions'],
    }),

    // Project Variable Inclusions endpoints
    getProjectVariableInclusions: builder.query<GetProjectVariableInclusionsResponse, number>({
      query: (projectId) => ({
        url: `/sample-automation/project-inclusions/${projectId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, projectId) => [{ type: 'ProjectVariableInclusions', id: projectId }],
    }),

    addProjectVariableInclusion: builder.mutation<AddProjectVariableInclusionResponse, AddProjectVariableInclusionParams>({
      query: ({ projectId, ...body }) => ({
        url: `/sample-automation/project-inclusions/${projectId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'ProjectVariableInclusions', id: projectId }],
    }),

    updateProjectVariableInclusion: builder.mutation<UpdateProjectVariableInclusionResponse, UpdateProjectVariableInclusionParams>({
      query: ({ inclusionId, ...body }) => ({
        url: `/sample-automation/project-inclusions/${inclusionId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ProjectVariableInclusions'],
    }),

    deleteProjectVariableInclusion: builder.mutation<DeleteProjectVariableInclusionResponse, number>({
      query: (inclusionId) => ({
        url: `/sample-automation/project-inclusions/${inclusionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProjectVariableInclusions'],
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
  // Header mappings management hooks
  useGetAllHeaderMappingsQuery,
  useLazyGetAllHeaderMappingsQuery,
  useDeleteHeaderMappingMutation,
  useDetectHeadersMutation,
  useLazyGetTablePreviewQuery,
  useCreateDNCScrubbedMutation,
  useGetDistinctAgeRangesQuery,
  useLazyGetDistinctAgeRangesQuery,
  useExtractFilesMutation,
  // NEW: Cleanup hook
  useCleanupTempFileMutation,
  // Computed Variables hooks
  usePreviewComputedVariableMutation,
  useAddComputedVariableMutation,
  useRemoveComputedVariableMutation,
  // Extraction Defaults hooks
  useGetExtractionVariablesQuery,
  useLazyGetExtractionVariablesQuery,
  useGetMasterExtractionDefaultsQuery,
  useSaveMasterExtractionDefaultsMutation,
  useGetClientExtractionDefaultsQuery,
  useLazyGetClientExtractionDefaultsQuery,
  useGetVendorClientExtractionDefaultsQuery,
  useLazyGetVendorClientExtractionDefaultsQuery,
  useGetProjectExtractionOverridesQuery,
  useLazyGetProjectExtractionOverridesQuery,
  useSaveClientExtractionDefaultsMutation,
  useSaveVendorClientExtractionDefaultsMutation,
  useSaveProjectExtractionOverridesMutation,
  useDeleteExtractionDefaultMutation,
  // Sample Tracking hooks
  useGetSampleTablesQuery,
  useLazyGetSampleTablesQuery,
  useGetSampleTableDetailsQuery,
  useLazyGetSampleTableDetailsQuery,
  useDeleteSampleTableMutation,
  // Variable Exclusions hooks
  useGetVariableExclusionsQuery,
  useLazyGetVariableExclusionsQuery,
  useAddVariableExclusionMutation,
  useUpdateVariableExclusionMutation,
  useDeleteVariableExclusionMutation,
  // Project Variable Inclusions hooks
  useGetProjectVariableInclusionsQuery,
  useLazyGetProjectVariableInclusionsQuery,
  useAddProjectVariableInclusionMutation,
  useUpdateProjectVariableInclusionMutation,
  useDeleteProjectVariableInclusionMutation,
} = sampleAutomationApiSlice;