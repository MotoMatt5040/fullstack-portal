// client/src/views/callid_management/useCallIDManagementLogic.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useGetDashboardMetricsQuery,
  useGetCurrentActiveAssignmentsQuery,
  useGetRecentActivityQuery,
  useLazyGetAllCallIDsQuery,
  useGetAllStatusCodesQuery,
  useGetAllStatesQuery,
  useCreateCallIDMutation,
  useUpdateCallIDMutation,
  useDeleteCallIDMutation,
  useAssignCallIDToProjectMutation,
  useEndAssignmentMutation,
  useLazyGetProjectCallIDsQuery,
} from '../../features/callIDApiSlice';

/**
 * Custom hook for Call ID Management logic
 * Handles data fetching, state management, and actions
 */
const useCallIDManagementLogic = () => {
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'assignments' | 'analytics'>('dashboard');
  const [filters, setFilters] = useState({
    status: '',
    stateFIPS: '',
    callerName: '',
    phoneNumber: '',
    inUse: '',
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedCallID, setSelectedCallID] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  // Assignments tab state
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [selectedProjectHistory, setSelectedProjectHistory] = useState<string | null>(null);
  const [projectHistory, setProjectHistory] = useState<any[]>([]);

  // ==================== API QUERIES ====================

  // Dashboard data
  const {
    data: dashboardMetrics,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useGetDashboardMetricsQuery(undefined, {
    skip: activeTab !== 'dashboard',
  });

  const {
    data: activeAssignments = [],
    isLoading: assignmentsLoading,
    refetch: refetchActiveAssignments,
  } = useGetCurrentActiveAssignmentsQuery(undefined, {
    skip: activeTab !== 'dashboard',
  });

  const {
    data: recentActivity = [],
    isLoading: activityLoading,
    refetch: refetchRecentActivity,
  } = useGetRecentActivityQuery(undefined, {
    skip: activeTab !== 'dashboard',
  });

  // Inventory data (lazy loaded when inventory tab is active)
  const [
    getAllCallIDs,
    {
      data: callIDInventory = [],
      isLoading: inventoryLoading,
      isFetching: inventoryFetching,
    },
  ] = useLazyGetAllCallIDsQuery();

  // Lookups
  const { data: statusCodes = [] } = useGetAllStatusCodesQuery();
  const { data: states = [] } = useGetAllStatesQuery();

  // Project history (lazy loaded)
  const [getProjectHistory, { data: projectHistoryData, isLoading: historyLoading }] = 
    useLazyGetProjectCallIDsQuery();

  // ==================== MUTATIONS ====================
  const [createCallID, { isLoading: creating }] = useCreateCallIDMutation();
  const [updateCallID, { isLoading: updating }] = useUpdateCallIDMutation();
  const [deleteCallID, { isLoading: deleting }] = useDeleteCallIDMutation();
  const [assignCallID, { isLoading: assigning }] = useAssignCallIDToProjectMutation();
  const [endAssignment, { isLoading: ending }] = useEndAssignmentMutation();

  // ==================== EFFECTS ====================

  // Load inventory when inventory tab is active
  useEffect(() => {
    if (activeTab === 'inventory') {
      getAllCallIDs(filters);
    }
  }, [activeTab, filters, getAllCallIDs]);

  // Load project history when selected
  useEffect(() => {
    if (selectedProjectHistory) {
      getProjectHistory(selectedProjectHistory);
    }
  }, [selectedProjectHistory, getProjectHistory]);

  // Update history data when loaded
  useEffect(() => {
    if (projectHistoryData) {
      setProjectHistory(projectHistoryData);
    }
  }, [projectHistoryData]);

  // ==================== COMPUTED VALUES ====================

  const isLoading = useMemo(() => {
    switch (activeTab) {
      case 'dashboard':
        return dashboardLoading || assignmentsLoading || activityLoading;
      case 'inventory':
        return inventoryLoading;
      default:
        return false;
    }
  }, [activeTab, dashboardLoading, assignmentsLoading, activityLoading, inventoryLoading]);

  // Status options for dropdowns
  const statusOptions = useMemo(() => {
    return statusCodes.map((status: any) => ({
      value: status.StatusCode,
      label: status.StatusDescription,
    }));
  }, [statusCodes]);

  // State options for dropdowns
  const stateOptions = useMemo(() => {
    return states.map((state: any) => ({
      value: state.StateFIPS,
      label: `${state.StateAbbr} - ${state.StateName}`,
    }));
  }, [states]);

  // Filtered active assignments for search
  const filteredActiveAssignments = useMemo(() => {
    if (!projectSearchQuery.trim()) return activeAssignments;
    const query = projectSearchQuery.toLowerCase();
    return activeAssignments.filter((a: any) => 
      a.ProjectID?.toLowerCase().includes(query)
    );
  }, [activeAssignments, projectSearchQuery]);

  // ==================== ACTIONS ====================

  const handleTabChange = useCallback((tab: 'dashboard' | 'inventory' | 'assignments' | 'analytics') => {
    setActiveTab(tab);
  }, []);

  const handleFilterChange = useCallback((filterName: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: '',
      stateFIPS: '',
      callerName: '',
      phoneNumber: '',
      inUse: '',
    });
  }, []);

  const handleRefresh = useCallback(() => {
    switch (activeTab) {
      case 'dashboard':
        refetchDashboard();
        refetchActiveAssignments();
        refetchRecentActivity();
        break;
      case 'inventory':
        getAllCallIDs(filters);
        break;
    }
  }, [activeTab, filters, refetchDashboard, refetchActiveAssignments, refetchRecentActivity, getAllCallIDs]);

  // Modal actions
  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);

  const openEditModal = useCallback((callID: any) => {
    setSelectedCallID(callID);
    setShowEditModal(true);
  }, []);
  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedCallID(null);
  }, []);

  const openDeleteModal = useCallback((callID: any) => {
    setSelectedCallID(callID);
    setShowDeleteModal(true);
  }, []);
  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setSelectedCallID(null);
  }, []);

  const openAssignModal = useCallback((callID: any) => {
    setSelectedCallID(callID);
    setShowAssignModal(true);
  }, []);
  const closeAssignModal = useCallback(() => {
    setShowAssignModal(false);
    setSelectedCallID(null);
  }, []);

  // CRUD actions
  const handleCreateCallID = useCallback(async (data: any) => {
    try {
      await createCallID(data).unwrap();
      closeCreateModal();
      handleRefresh();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to create call ID:', error);
      return { success: false, error: error?.data?.message || 'Failed to create call ID' };
    }
  }, [createCallID, closeCreateModal, handleRefresh]);

  const handleUpdateCallID = useCallback(async (id: number, data: any) => {
    try {
      await updateCallID({ id, data }).unwrap();
      closeEditModal();
      handleRefresh();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update call ID:', error);
      return { success: false, error: error?.data?.message || 'Failed to update call ID' };
    }
  }, [updateCallID, closeEditModal, handleRefresh]);

  const handleDeleteCallID = useCallback(async (id: number) => {
    try {
      await deleteCallID(id).unwrap();
      closeDeleteModal();
      handleRefresh();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete call ID:', error);
      return { success: false, error: error?.data?.message || 'Failed to delete call ID' };
    }
  }, [deleteCallID, closeDeleteModal, handleRefresh]);

  const handleAssignCallID = useCallback(async (data: any) => {
    try {
      await assignCallID(data).unwrap();
      closeAssignModal();
      handleRefresh();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to assign call ID:', error);
      return { success: false, error: error?.data?.message || 'Failed to assign call ID' };
    }
  }, [assignCallID, closeAssignModal, handleRefresh]);

  const handleEndAssignment = useCallback(async (projectId: string, phoneNumberId: number) => {
    try {
      await endAssignment({ projectId, phoneNumberId }).unwrap();
      handleRefresh();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to end assignment:', error);
      return { success: false, error: error?.data?.message || 'Failed to end assignment' };
    }
  }, [endAssignment, handleRefresh]);

  const handleSwapNumber = useCallback((assignment: any) => {
    setSelectedAssignment(assignment);
    setShowSwapModal(true);
  }, []);

  const closeSwapModal = useCallback(() => {
    setShowSwapModal(false);
    setSelectedAssignment(null);
  }, []);

  const handleEndAssignmentClick = useCallback(async (assignment: any) => {
    if (window.confirm(`End assignment for ${assignment.ProjectID}?`)) {
      const result = await handleEndAssignment(assignment.ProjectID, assignment.PhoneNumberID);
      if (!result.success) {
        alert(result.error);
      }
    }
  }, [handleEndAssignment]);

  const handleSwapSubmit = useCallback(async (newPhoneNumberId: number) => {
    if (!selectedAssignment) return { success: false, error: 'No assignment selected' };

    try {
      // End current assignment
      await endAssignment({
        projectId: selectedAssignment.ProjectID,
        phoneNumberId: selectedAssignment.PhoneNumberID,
      }).unwrap();

      // Assign new number
      await assignCallID({
        projectId: selectedAssignment.ProjectID,
        phoneNumberId: newPhoneNumberId,
        startDate: new Date().toISOString(),
      }).unwrap();

      closeSwapModal();
      handleRefresh();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to swap number:', error);
      return { success: false, error: error?.data?.message || 'Failed to swap number' };
    }
  }, [selectedAssignment, endAssignment, assignCallID, closeSwapModal, handleRefresh]);

  const handleViewHistory = useCallback((projectId: string) => {
    setSelectedProjectHistory(projectId);
  }, []);

  // ==================== RETURN ====================
  return {
    // State
    activeTab,
    filters,
    showCreateModal,
    showEditModal,
    showDeleteModal,
    showAssignModal,
    showSwapModal,
    selectedCallID,
    selectedAssignment,
    projectSearchQuery,
    setProjectSearchQuery,
    selectedProjectHistory,
    setSelectedProjectHistory,
    projectHistory,
    filteredActiveAssignments,

    // Data
    dashboardMetrics,
    activeAssignments,
    recentActivity,
    callIDInventory,
    statusOptions,
    stateOptions,

    // Loading states
    isLoading,
    inventoryFetching,
    creating,
    updating,
    deleting,
    assigning,
    ending,

    // Actions
    handleTabChange,
    handleFilterChange,
    handleClearFilters,
    handleRefresh,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    openAssignModal,
    closeAssignModal,
    handleCreateCallID,
    handleUpdateCallID,
    handleDeleteCallID,
    handleAssignCallID,
    handleEndAssignment,
    handleSwapNumber,
    closeSwapModal,
    handleSwapSubmit,
    handleEndAssignmentClick,
    handleViewHistory,
  };
};

export default useCallIDManagementLogic;