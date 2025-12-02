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
  useGetAllProjectsWithAssignmentsQuery,
  useUpdateAssignmentMutation,
  useSwapCallIDAssignmentMutation,
  useGetUtilizationMetricsQuery,
  useGetMostUsedCallIDsQuery,
  useGetIdleCallIDsQuery,
  useGetStateCoverageQuery,
  useGetUsageTimelineQuery,
  useReassignCallIDMutation,
  useUpdateProjectSlotMutation,
} from '../../features/callIDApiSlice';

/**
 * Custom hook for Call ID Management logic
 * Handles data fetching, state management, and actions
 */
const useCallIDManagementLogic = () => {
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'inventory' | 'assignments' | 'analytics'
  >('dashboard');
  const [idleDaysFilter, setIdleDaysFilter] = useState(30);
  const [mostUsedLimit, setMostUsedLimit] = useState(10);
  const [timelineMonths, setTimelineMonths] = useState(6);
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
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [showAssignToProjectModal, setShowAssignToProjectModal] =
    useState(false);
  const [selectedCallID, setSelectedCallID] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showProjectSlotsModal, setShowProjectSlotsModal] = useState(false);
  const [selectedProjectSlots, setSelectedProjectSlots] = useState<
    string | null
  >(null);
  const [currentProjectSlots, setCurrentProjectSlots] = useState<any[]>([]);

  // Assignments tab state
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [selectedProjectHistory, setSelectedProjectHistory] = useState<
    string | null
  >(null);
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
    data: activeAssignmentsRaw = [],
    isLoading: assignmentsLoading,
    refetch: refetchActiveAssignments,
  } = useGetCurrentActiveAssignmentsQuery(undefined, {
    skip: activeTab !== 'dashboard',
  });

  // Sort active assignments by StartDate (newest first)
  const activeAssignments = useMemo(() => {
    return [...activeAssignmentsRaw].sort((a, b) => {
      const dateA = new Date(a.StartDate).getTime();
      const dateB = new Date(b.StartDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [activeAssignmentsRaw]);

  const {
    data: recentActivityRaw = [],
    isLoading: activityLoading,
    refetch: refetchRecentActivity,
  } = useGetRecentActivityQuery(undefined, {
    skip: activeTab !== 'dashboard',
  });

  // Sort recent activity by StartDate (newest first)
  const recentActivity = useMemo(() => {
    return [...recentActivityRaw].sort((a, b) => {
      const dateA = new Date(a.StartDate).getTime();
      const dateB = new Date(b.StartDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [recentActivityRaw]);

  // Inventory data (lazy loaded when inventory tab is active)
  const [
    getAllCallIDs,
    {
      data: callIDResponse,
      isLoading: inventoryLoading,
      isFetching: inventoryFetching,
    },
  ] = useLazyGetAllCallIDsQuery();

  // Extract data and pagination from response
  const callIDInventory = callIDResponse?.data || [];
  const paginationInfo = callIDResponse?.pagination;

  // Lookups
  const { data: statusCodes = [] } = useGetAllStatusCodesQuery();
  const { data: states = [] } = useGetAllStatesQuery();

  // Project history (lazy loaded)
  const [
    getProjectHistory,
    { data: projectHistoryData, isLoading: historyLoading },
  ] = useLazyGetProjectCallIDsQuery();

  // Projects with assignments (for assignments tab)
  const {
    data: projectsWithAssignmentsData,
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useGetAllProjectsWithAssignmentsQuery(undefined, {
    skip: activeTab !== 'assignments',
  });
  const [reassignCallID, { isLoading: reassigning }] =
    useReassignCallIDMutation();

  // Extract the actual data array from the API response
  const projectsWithAssignments = projectsWithAssignmentsData?.data || [];

  // Analytics data
  const {
    data: utilizationMetrics,
    isLoading: utilizationLoading,
    refetch: refetchUtilization,
  } = useGetUtilizationMetricsQuery(undefined, {
    skip: activeTab !== 'analytics',
  });

  const {
    data: mostUsedCallIDs = [],
    isLoading: mostUsedLoading,
    refetch: refetchMostUsed,
  } = useGetMostUsedCallIDsQuery(mostUsedLimit, {
    skip: activeTab !== 'analytics',
  });

  const {
    data: idleCallIDs = [],
    isLoading: idleLoading,
    refetch: refetchIdle,
  } = useGetIdleCallIDsQuery(idleDaysFilter, {
    skip: activeTab !== 'analytics',
  });

  const {
    data: stateCoverage = [],
    isLoading: coverageLoading,
    refetch: refetchCoverage,
  } = useGetStateCoverageQuery(undefined, {
    skip: activeTab !== 'analytics',
  });

  const {
    data: usageTimeline = [],
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useGetUsageTimelineQuery(timelineMonths, {
    skip: activeTab !== 'analytics',
  });

  // ==================== MUTATIONS ====================
  const [createCallID, { isLoading: creating }] = useCreateCallIDMutation();
  const [updateCallID, { isLoading: updating }] = useUpdateCallIDMutation();
  const [deleteCallID, { isLoading: deleting }] = useDeleteCallIDMutation();
  const [assignCallID, { isLoading: assigning }] =
    useAssignCallIDToProjectMutation();
  const [endAssignment, { isLoading: ending }] = useEndAssignmentMutation();
  const [updateAssignment, { isLoading: updatingAssignment }] =
    useUpdateAssignmentMutation();
  const [swapAssignment, { isLoading: swappingAssignment }] =
    useSwapCallIDAssignmentMutation();
  const [updateProjectSlot, { isLoading: updatingSlot }] =
    useUpdateProjectSlotMutation();

  // ==================== EFFECTS ====================

  // Load inventory when inventory tab is active
  useEffect(() => {
    getAllCallIDs(filters);
  }, [filters, getAllCallIDs]);

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
      case 'assignments':
        return projectsLoading;
      case 'analytics':
        return (
          utilizationLoading ||
          mostUsedLoading ||
          idleLoading ||
          coverageLoading ||
          timelineLoading
        );
      default:
        return false;
    }
  }, [
    activeTab,
    dashboardLoading,
    assignmentsLoading,
    activityLoading,
    inventoryLoading,
    projectsLoading,
    utilizationLoading,
    mostUsedLoading,
    idleLoading,
    coverageLoading,
    timelineLoading,
  ]);

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

  // Filtered projects for assignments tab
  const filteredProjects = useMemo(() => {
    if (!projectsWithAssignments) return [];

    if (!projectSearchQuery) return projectsWithAssignments;

    return projectsWithAssignments.filter((project: any) =>
      project.ProjectID.toLowerCase().includes(projectSearchQuery.toLowerCase())
    );
  }, [projectsWithAssignments, projectSearchQuery]);

  // Available numbers (not currently in use)
  const availableNumbers = useMemo(() => {
    return callIDInventory.filter((callID: any) => !callID.CurrentlyInUse);
  }, [callIDInventory]);

  // ==================== ACTIONS ====================

  const handleTabChange = useCallback(
    (tab: 'dashboard' | 'inventory' | 'assignments' | 'analytics') => {
      setActiveTab(tab);
    },
    []
  );

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
      case 'assignments':
        refetchProjects();
        if (selectedProjectHistory) {
          getProjectHistory(selectedProjectHistory);
        }
        break;
      case 'analytics':
        refetchUtilization();
        refetchMostUsed();
        refetchIdle();
        refetchCoverage();
        refetchTimeline();
        break;
    }
  }, [
    activeTab,
    filters,
    refetchDashboard,
    refetchActiveAssignments,
    refetchRecentActivity,
    getAllCallIDs,
    refetchProjects,
    selectedProjectHistory,
    getProjectHistory,
    refetchUtilization,
    refetchMostUsed,
    refetchIdle,
    refetchCoverage,
    refetchTimeline,
  ]);

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
  const handleCreateCallID = useCallback(
    async (data: any) => {
      try {
        await createCallID(data).unwrap();
        closeCreateModal();
        handleRefresh();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to create call ID:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to create call ID',
        };
      }
    },
    [createCallID, closeCreateModal, handleRefresh]
  );

  const handleUpdateCallID = useCallback(
    async (id: number, data: any) => {
      try {
        await updateCallID({ id, data }).unwrap();
        closeEditModal();
        handleRefresh();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to update call ID:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to update call ID',
        };
      }
    },
    [updateCallID, closeEditModal, handleRefresh]
  );

  const handleDeleteCallID = useCallback(
    async (id: number) => {
      try {
        await deleteCallID(id).unwrap();
        closeDeleteModal();
        handleRefresh();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to delete call ID:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to delete call ID',
        };
      }
    },
    [deleteCallID, closeDeleteModal, handleRefresh]
  );

  const handleAssignCallID = useCallback(
    async (data: any) => {
      try {
        // Use the updateProjectSlot mutation instead
        await updateProjectSlot({
          projectId: data.projectId,
          slotName: data.slotName,
          phoneNumberId: data.phoneNumberId,
          startDate: data.startDate,
          endDate: data.endDate,
        }).unwrap();

        closeAssignModal();
        handleRefresh();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to assign call ID:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to assign call ID',
        };
      }
    },
    [updateProjectSlot, closeAssignModal, handleRefresh]
  );

  const handleEndAssignment = useCallback(
    async (projectId: string, phoneNumberId: number) => {
      try {
        await endAssignment({ projectId, phoneNumberId }).unwrap();
        handleRefresh();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to end assignment:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to end assignment',
        };
      }
    },
    [endAssignment, handleRefresh]
  );

  const handleSwapNumber = useCallback((assignment: any) => {
    setSelectedAssignment(assignment);
    setShowSwapModal(true);
  }, []);

  const closeSwapModal = useCallback(() => {
    setShowSwapModal(false);
    setSelectedAssignment(null);
  }, []);

  const handleEndAssignmentClick = useCallback(
    async (assignment: any) => {
      if (window.confirm(`End assignment for ${assignment.ProjectID}?`)) {
        const result = await handleEndAssignment(
          assignment.ProjectID,
          assignment.PhoneNumberID
        );
        if (!result.success) {
          alert(result.error);
        }
      }
    },
    [handleEndAssignment]
  );

  const handleSwapSubmit = useCallback(
    async (newPhoneNumberId: number) => {
      if (!selectedAssignment)
        return { success: false, error: 'No assignment selected' };

      try {
        await reassignCallID({
          projectId: selectedAssignment.ProjectID,
          oldPhoneNumberId: selectedAssignment.PhoneNumberID,
          newPhoneNumberId: newPhoneNumberId,
        }).unwrap();

        closeSwapModal();
        handleRefresh();
        return { success: true };
      } catch (error: any) {
        console.error('Failed to reassign number:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to reassign number',
        };
      }
    },
    [selectedAssignment, reassignCallID, closeSwapModal, handleRefresh]
  );

  const handleViewHistory = useCallback((projectId: string) => {
    setSelectedProjectHistory(projectId);
  }, []);

  // ==================== ASSIGNMENT TAB ACTIONS ====================

  const handleViewProjectHistory = useCallback(
    async (projectId: string) => {
      setSelectedProjectHistory(projectId);
      try {
        const result = await getProjectHistory(projectId);
        if (result.data) {
          setProjectHistory(result.data);
        }
      } catch (error) {
        console.error('Error fetching project history:', error);
      }
    },
    [getProjectHistory]
  );

  const handleOpenEditAssignmentModal = useCallback((assignment: any) => {
    setSelectedAssignment(assignment);
    setShowEditAssignmentModal(true);
  }, []);

  const closeEditAssignmentModal = useCallback(() => {
    setShowEditAssignmentModal(false);
    setSelectedAssignment(null);
  }, []);

  const handleUpdateAssignment = useCallback(
    async (data: any) => {
      try {
        await updateAssignment(data).unwrap();

        if (selectedProjectHistory) {
          await handleViewProjectHistory(selectedProjectHistory);
        }

        closeEditAssignmentModal();
        return { success: true };
      } catch (error: any) {
        console.error('Error updating assignment:', error);
        alert(error.data?.message || 'Failed to update assignment');
        return { success: false, error: error.data?.message };
      }
    },
    [
      updateAssignment,
      selectedProjectHistory,
      handleViewProjectHistory,
      closeEditAssignmentModal,
    ]
  );

  const handleOpenSwapModal = useCallback((assignment: any) => {
    setSelectedAssignment(assignment);
    setShowSwapModal(true);
  }, []);

  const handleSwapAssignment = useCallback(
    async (data: any) => {
      try {
        await swapAssignment(data).unwrap();

        await refetchProjects();
        if (selectedProjectHistory) {
          await handleViewProjectHistory(selectedProjectHistory);
        }

        closeSwapModal();
        return { success: true };
      } catch (error: any) {
        console.error('Error swapping assignment:', error);
        alert(error.data?.message || 'Failed to swap assignment');
        return { success: false, error: error.data?.message };
      }
    },
    [
      swapAssignment,
      refetchProjects,
      selectedProjectHistory,
      handleViewProjectHistory,
      closeSwapModal,
    ]
  );

  const handleOpenAssignModal = useCallback((callID: any) => {
    setSelectedCallID(callID);
    setShowAssignToProjectModal(true);
  }, []);

  const closeAssignToProjectModal = useCallback(() => {
    setShowAssignToProjectModal(false);
    setSelectedCallID(null);
  }, []);

  const handleAssignToProject = useCallback(
    async (data: any) => {
      try {
        await assignCallID(data).unwrap();

        if (selectedProjectHistory) {
          await handleViewProjectHistory(selectedProjectHistory);
        }

        closeAssignToProjectModal();
        return { success: true };
      } catch (error: any) {
        console.error('Error assigning call ID:', error);
        alert(error.data?.message || 'Failed to assign call ID');
        return { success: false, error: error.data?.message };
      }
    },
    [
      assignCallID,
      selectedProjectHistory,
      handleViewProjectHistory,
      closeAssignToProjectModal,
    ]
  );

  const handleManageProjectSlots = useCallback(
    (projectId: string, currentAssignments: any[]) => {
      setSelectedProjectSlots(projectId);
      setCurrentProjectSlots(currentAssignments);
      setShowProjectSlotsModal(true);
      // Load inventory for slot assignment
      getAllCallIDs({ inUse: 'false' });
    },
    [getAllCallIDs]
  );

  const closeProjectSlotsModal = useCallback(() => {
    setShowProjectSlotsModal(false);
    setSelectedProjectSlots(null);
    setCurrentProjectSlots([]);
  }, []);

  const handleAssignSlot = useCallback(
    async (
      projectId: string,
      slotName: string,
      phoneNumberId: number | null,
      startDate?: string,
      endDate?: string
    ) => {
      console.log('[handleAssignSlot] Called with:', { projectId, slotName, phoneNumberId, startDate, endDate });
      try {
        console.log('[handleAssignSlot] Calling updateProjectSlot mutation...');
        const result = await updateProjectSlot({
          projectId,
          slotName,
          phoneNumberId,
          startDate,
          endDate,
        }).unwrap();
        console.log('[handleAssignSlot] updateProjectSlot result:', result);

        // Refresh data
        console.log('[handleAssignSlot] Refreshing active assignments...');
        await refetchActiveAssignments();

        // Reload current slots
        if (selectedProjectSlots) {
          console.log('[handleAssignSlot] Reloading current project slots...');
          const updatedAssignments = await refetchActiveAssignments();
          if (updatedAssignments.data) {
            const projectAssignments = updatedAssignments.data.filter(
              (a: any) => a.ProjectID === selectedProjectSlots
            );
            console.log('[handleAssignSlot] Updated project assignments:', projectAssignments);
            setCurrentProjectSlots(projectAssignments);
          }
        }

        console.log('[handleAssignSlot] Success!');
        return { success: true };
      } catch (error: any) {
        console.error('[handleAssignSlot] Error:', error);
        console.error('[handleAssignSlot] Error data:', error?.data);
        return {
          success: false,
          error: error?.data?.message || 'Failed to assign slot',
        };
      }
    },
    [updateProjectSlot, refetchActiveAssignments, selectedProjectSlots]
  );

  const handleRemoveSlot = useCallback(
    async (projectId: string, phoneNumberId: number) => {
      try {
        await endAssignment({ projectId, phoneNumberId }).unwrap();

        // Refresh data
        await refetchActiveAssignments();

        // Reload current slots
        if (selectedProjectSlots) {
          const updatedAssignments = await refetchActiveAssignments();
          if (updatedAssignments.data) {
            const projectAssignments = updatedAssignments.data.filter(
              (a: any) => a.ProjectID === selectedProjectSlots
            );
            setCurrentProjectSlots(projectAssignments);
          }
        }

        return { success: true };
      } catch (error: any) {
        console.error('Error removing slot:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to remove slot',
        };
      }
    },
    [endAssignment, refetchActiveAssignments, selectedProjectSlots]
  );

  const handleUpdateSlotDates = useCallback(
    async (
      projectId: string,
      phoneNumberId: number,
      startDate: string,
      endDate: string
    ) => {
      try {
        await updateAssignment({
          projectId,
          phoneNumberId,
          startDate,
          endDate,
        }).unwrap();

        // Refresh data - only if query is active
        try {
          const updatedAssignments = await refetchActiveAssignments();

          // Reload current slots
          if (selectedProjectSlots && updatedAssignments.data) {
            const projectAssignments = updatedAssignments.data.filter(
              (a: any) => a.ProjectID === selectedProjectSlots
            );
            setCurrentProjectSlots(projectAssignments);
          }
        } catch (refetchError) {
          // Ignore refetch errors - the query may not be active
          console.log('Could not refetch assignments (query not active)');
        }

        return { success: true };
      } catch (error: any) {
        console.error('Error updating slot dates:', error);
        return {
          success: false,
          error: error?.data?.message || 'Failed to update dates',
        };
      }
    },
    [updateAssignment, refetchActiveAssignments, selectedProjectSlots]
  );

  // ==================== ANALYTICS FILTER ACTIONS ====================

  const handleIdleDaysChange = useCallback((days: number) => {
    setIdleDaysFilter(days);
  }, []);

  const handleMostUsedLimitChange = useCallback((limit: number) => {
    setMostUsedLimit(limit);
  }, []);

  const handleTimelineMonthsChange = useCallback((months: number) => {
    setTimelineMonths(months);
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
    availableNumbers,

    // Analytics data
    utilizationMetrics,
    mostUsedCallIDs,
    idleCallIDs,
    stateCoverage,
    usageTimeline,
    idleDaysFilter,
    mostUsedLimit,
    timelineMonths,

    // Loading states
    isLoading,
    inventoryFetching,
    creating,
    updating,
    deleting,
    assigning,
    ending,
    reassigning,

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

    // Assignments tab
    projectsWithAssignments: filteredProjects,
    projectsLoading,
    projectHistoryLoading: historyLoading,
    handleViewProjectHistory,

    // Assignment modals
    showEditAssignmentModal,
    handleOpenEditAssignmentModal,
    closeEditAssignmentModal,
    handleUpdateAssignment,
    updatingAssignment,

    handleOpenSwapModal,
    handleSwapAssignment,
    swappingAssignment,

    showAssignToProjectModal,
    handleOpenAssignModal,
    closeAssignToProjectModal,
    handleAssignToProject,

    // Analytics actions
    handleIdleDaysChange,
    handleMostUsedLimitChange,
    handleTimelineMonthsChange,
    // Project slots modal
    showProjectSlotsModal,
    selectedProjectSlots,
    currentProjectSlots,
    handleManageProjectSlots,
    closeProjectSlotsModal,
    handleAssignSlot,
    handleRemoveSlot,
    handleUpdateSlotDates,
  };
};

export default useCallIDManagementLogic;
