import { apiSlice } from '../app/api/apiSlice';

/**
 * Call ID Management API Slice
 * Handles all API calls for call ID inventory, assignments, analytics, and lookups
 */

export const callIDApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ==================== DASHBOARD ENDPOINTS ====================

    /**
     * Get dashboard overview metrics
     */
    getDashboardMetrics: builder.query({
      query: () => '/callid/dashboard',
      providesTags: ['CallIDDashboard'],
    }),

    /**
     * Get currently active assignments
     */
    getCurrentActiveAssignments: builder.query({
      query: () => '/callid/dashboard/active-assignments',
      providesTags: ['CallIDActiveAssignments'],
    }),

    /**
     * Get recent activity (last 20 changes)
     */
    getRecentActivity: builder.query({
      query: () => '/callid/dashboard/recent-activity',
      providesTags: ['CallIDRecentActivity'],
    }),

    // ==================== INVENTORY ENDPOINTS ====================

    /**
     * Get all call IDs with optional filters
     * @param {Object} params - Filter parameters
     * @param {number} params.status - Status code filter
     * @param {string} params.stateFIPS - State FIPS code filter
     * @param {string} params.callerName - Caller name search
     * @param {string} params.phoneNumber - Phone number search
     * @param {boolean} params.inUse - Filter by currently in use
     */
    getAllCallIDs: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();

        if (params.status) queryParams.append('status', params.status);
        if (params.stateFIPS) queryParams.append('stateFIPS', params.stateFIPS);
        if (params.callerName)
          queryParams.append('callerName', params.callerName);
        if (params.phoneNumber)
          queryParams.append('phoneNumber', params.phoneNumber);
        if (params.inUse !== undefined)
          queryParams.append('inUse', params.inUse);
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);

        const queryString = queryParams.toString();
        return `/callid/inventory${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['CallIDInventory'],
    }),

    /**
     * Get a single call ID by ID
     * @param {number} id - Phone number ID
     */
    getCallIDById: builder.query({
      query: (id) => `/callid/inventory/${id}`,
      providesTags: (result, error, id) => [{ type: 'CallIDInventory', id }],
    }),

    /**
     * Create a new call ID
     * @param {Object} data - Call ID data
     * @param {string} data.phoneNumber - 10-digit phone number
     * @param {number} data.status - Status code
     * @param {string} data.callerName - Display name
     * @param {string} data.stateFIPS - State FIPS code
     */
    createCallID: builder.mutation({
      query: (data) => ({
        url: '/callid/inventory',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        'CallIDInventory',
        'CallIDDashboard',
        'CallIDAnalytics',
      ],
    }),

    /**
     * Update an existing call ID
     * @param {Object} params
     * @param {number} params.id - Phone number ID
     * @param {Object} params.data - Updated fields
     */
    updateCallID: builder.mutation({
      query: ({ id, data }) => ({
        url: `/callid/inventory/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CallIDInventory', id },
        'CallIDInventory',
        'CallIDDashboard',
      ],
    }),

    /**
     * Delete a call ID
     * @param {number} id - Phone number ID
     */
    deleteCallID: builder.mutation({
      query: (id) => ({
        url: `/callid/inventory/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        'CallIDInventory',
        'CallIDDashboard',
        'CallIDAnalytics',
      ],
    }),

    // ==================== USAGE/ASSIGNMENT ENDPOINTS ====================

    /**
     * Get usage history for a specific call ID
     * @param {number} phoneNumberId - Phone number ID
     */
    getCallIDUsageHistory: builder.query({
      query: (phoneNumberId) => `/callid/usage/history/${phoneNumberId}`,
      providesTags: (result, error, phoneNumberId) => [
        { type: 'CallIDUsage', id: phoneNumberId },
      ],
    }),

    /**
     * Get all call IDs used by a specific project
     * @param {string} projectId - Project ID
     */
    getProjectCallIDs: builder.query({
      query: (projectId) => `/callid/usage/project/${projectId}`,
      providesTags: (result, error, projectId) => [
        { type: 'ProjectCallIDs', id: projectId },
      ],
    }),

    /**
     * Assign a call ID to a project
     * @param {Object} data - Assignment data
     * @param {string} data.projectId - Project ID
     * @param {number} data.phoneNumberId - Phone number ID
     * @param {string} data.startDate - Start date (ISO format)
     * @param {string} data.endDate - End date (ISO format)
     */
    assignCallIDToProject: builder.mutation({
      query: (data) => ({
        url: '/callid/usage/assign',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        'CallIDInventory',
        'CallIDActiveAssignments',
        'CallIDRecentActivity',
        'CallIDUsage',
        'ProjectCallIDs',
      ],
    }),

    /**
     * End an assignment (sets end date to now)
     * @param {Object} params
     * @param {string} params.projectId - Project ID
     * @param {number} params.phoneNumberId - Phone number ID
     */
    endAssignment: builder.mutation({
      query: ({ projectId, phoneNumberId }) => ({
        url: `/callid/usage/assign/${projectId}/${phoneNumberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        'CallIDInventory',
        'CallIDActiveAssignments',
        'CallIDRecentActivity',
        'CallIDUsage',
        'ProjectCallIDs',
      ],
    }),

    reassignCallID: builder.mutation({
  query: (data) => ({
    url: '/callid/assignments/reassign',
    method: 'POST',
    body: data,
  }),
  invalidatesTags: [
    'CallIDInventory',
    'CallIDActiveAssignments',
    'ProjectAssignments',
    'CallIDUsage',
  ],
}),

    getAllProjectsWithAssignments: builder.query({
      query: () => '/callid/assignments/projects',
      providesTags: ['ProjectAssignments'],
    }),

    checkAssignmentConflict: builder.mutation({
      query: (data) => ({
        url: '/callid/assignments/check-conflict',
        method: 'POST',
        body: data,
      }),
    }),

    updateAssignment: builder.mutation({
      query: ({ projectId, phoneNumberId, ...data }) => ({
        url: `/callid/assignments/${projectId}/${phoneNumberId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [
        'CallIDs',
        'ProjectAssignments',
        'CallIDUsage',
        'ActiveAssignments',
      ],
    }),

    swapCallIDAssignment: builder.mutation({
      query: (data) => ({
        url: '/callid/assignments/swap',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        'CallIDs',
        'ProjectAssignments',
        'CallIDUsage',
        'ActiveAssignments',
      ],
    }),

     /**
     * Update a specific slot for a project
     * @param {Object} data
     * @param {string} data.projectId - Project ID
     * @param {string} data.slotName - CallIDL1, CallIDL2, CallIDC1, or CallIDC2
     * @param {number} data.phoneNumberId - Phone number ID to assign (or null to clear)
     */
    updateProjectSlot: builder.mutation({
      query: (data) => ({
        url: '/callid/projects/slots',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: [
        'CallIDInventory',
        'CallIDActiveAssignments',
        'CallIDDashboard',
        'CallIDRecentActivity',
      ],
    }),

    /**
     * Remove/clear a specific slot
     * @param {Object} data
     * @param {string} data.projectId - Project ID
     * @param {string} data.slotName - CallIDL1, CallIDL2, CallIDC1, or CallIDC2
     */
    removeProjectSlot: builder.mutation({
      query: (data) => ({
        url: '/callid/projects/slots',
        method: 'DELETE',
        body: data,
      }),
      invalidatesTags: [
        'CallIDInventory',
        'CallIDActiveAssignments',
        'CallIDDashboard',
        'CallIDRecentActivity',
      ],
    }),

    // ==================== ANALYTICS ENDPOINTS ====================

    /**
     * Get utilization metrics
     */
    getUtilizationMetrics: builder.query({
      query: () => '/callid/analytics/utilization',
      providesTags: ['CallIDAnalytics'],
    }),

    /**
     * Get most used call IDs
     * @param {number} limit - Number of results to return (default: 10)
     */
    getMostUsedCallIDs: builder.query({
      query: (limit = 10) => `/callid/analytics/most-used?limit=${limit}`,
      providesTags: ['CallIDAnalytics'],
    }),

    /**
     * Get idle call IDs (not used in X days)
     * @param {number} days - Number of days threshold (default: 30)
     */
    getIdleCallIDs: builder.query({
      query: (days = 30) => `/callid/analytics/idle?days=${days}`,
      providesTags: ['CallIDAnalytics'],
    }),

    /**
     * Get state coverage analysis
     */
    getStateCoverage: builder.query({
      query: () => '/callid/analytics/state-coverage',
      providesTags: ['CallIDAnalytics'],
    }),

    /**
     * Get usage timeline (historical trends)
     * @param {number} months - Number of months to look back (default: 6)
     */
    getUsageTimeline: builder.query({
      query: (months = 6) => `/callid/analytics/timeline?months=${months}`,
      providesTags: ['CallIDAnalytics'],
    }),

    // ==================== LOOKUP ENDPOINTS ====================

    /**
     * Get all status codes
     */
    getAllStatusCodes: builder.query({
      query: () => '/callid/lookups/status-codes',
      providesTags: ['CallIDLookups'],
    }),

    /**
     * Get all states
     */
    getAllStates: builder.query({
      query: () => '/callid/lookups/states',
      providesTags: ['CallIDLookups'],
    }),

    /**
     * Get available call IDs for a specific state and date range
     * @param {Object} params
     * @param {string} params.stateFIPS - State FIPS code
     * @param {string} params.startDate - Start date (ISO format)
     * @param {string} params.endDate - End date (ISO format)
     */
    getAvailableCallIDsForState: builder.query({
      query: ({ stateFIPS, startDate, endDate }) => {
        const queryParams = new URLSearchParams({
          stateFIPS,
          startDate,
          endDate,
        });
        return `/callid/lookups/available?${queryParams.toString()}`;
      },
      providesTags: ['CallIDLookups'],
    }),
  }),
});

// Export hooks for all endpoints
export const {
  // Dashboard
  useGetDashboardMetricsQuery,
  useLazyGetDashboardMetricsQuery,
  useGetCurrentActiveAssignmentsQuery,
  useLazyGetCurrentActiveAssignmentsQuery,
  useGetRecentActivityQuery,
  useLazyGetRecentActivityQuery,

  // Inventory
  useGetAllCallIDsQuery,
  useLazyGetAllCallIDsQuery,
  useGetCallIDByIdQuery,
  useLazyGetCallIDByIdQuery,
  useCreateCallIDMutation,
  useUpdateCallIDMutation,
  useDeleteCallIDMutation,

  // Usage/Assignments
  useGetCallIDUsageHistoryQuery,
  useLazyGetCallIDUsageHistoryQuery,
  useGetProjectCallIDsQuery,
  useLazyGetProjectCallIDsQuery,
  useAssignCallIDToProjectMutation,
  useUpdateAssignmentMutation,
  useEndAssignmentMutation,
  useGetAllProjectsWithAssignmentsQuery,
  useCheckAssignmentConflictMutation,
  useSwapCallIDAssignmentMutation,
  useReassignCallIDMutation,
  useUpdateProjectSlotMutation,
  useRemoveProjectSlotMutation,

  // Analytics
  useGetUtilizationMetricsQuery,
  useLazyGetUtilizationMetricsQuery,
  useGetMostUsedCallIDsQuery,
  useLazyGetMostUsedCallIDsQuery,
  useGetIdleCallIDsQuery,
  useLazyGetIdleCallIDsQuery,
  useGetStateCoverageQuery,
  useLazyGetStateCoverageQuery,
  useGetUsageTimelineQuery,
  useLazyGetUsageTimelineQuery,

  // Lookups
  useGetAllStatusCodesQuery,
  useGetAllStatesQuery,
  useGetAvailableCallIDsForStateQuery,
  useLazyGetAvailableCallIDsForStateQuery,
} = callIDApiSlice;
