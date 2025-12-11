// client/src/views/callid_management/useCallIDManagementLogic.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
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

type TabType = 'dashboard' | 'inventory' | 'assignments' | 'analytics';
const VALID_TABS: TabType[] = ['dashboard', 'inventory', 'assignments', 'analytics'];

/**
 * Custom hook for Call ID Management logic
 * Handles data fetching, state management, and actions
 */
const useCallIDManagementLogic = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Get initial tab from URL or default to 'dashboard'
  const getInitialTab = (): TabType => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }
    return 'dashboard';
  };

  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
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

  // Inventory pagination state
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryLimit, setInventoryLimit] = useState(50);

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
  } = useGetDashboardMetricsQuery();

  const {
    data: activeAssignmentsRaw = [],
    isLoading: assignmentsLoading,
    refetch: refetchActiveAssignments,
  } = useGetCurrentActiveAssignmentsQuery();

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
  } = useGetRecentActivityQuery();

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
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = useGetAllProjectsWithAssignmentsQuery(undefined, {
    // Always fetch, let cache invalidation handle updates
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
  } = useGetUtilizationMetricsQuery();

  const {
    data: mostUsedCallIDs = [],
    isLoading: mostUsedLoading,
    refetch: refetchMostUsed,
  } = useGetMostUsedCallIDsQuery(mostUsedLimit);

  const {
    data: idleCallIDs = [],
    isLoading: idleLoading,
    refetch: refetchIdle,
  } = useGetIdleCallIDsQuery(idleDaysFilter);

  const {
    data: stateCoverage = [],
    isLoading: coverageLoading,
    refetch: refetchCoverage,
  } = useGetStateCoverageQuery();

  const {
    data: usageTimeline = [],
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useGetUsageTimelineQuery(timelineMonths);

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

  // Refetch data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        refetchDashboard();
        refetchActiveAssignments();
        refetchRecentActivity();
        break;
      case 'inventory':
        getAllCallIDs({ ...filters, page: inventoryPage, limit: inventoryLimit });
        break;
      case 'assignments':
        refetchProjects();
        break;
      case 'analytics':
        refetchUtilization();
        refetchMostUsed();
        refetchIdle();
        refetchCoverage();
        refetchTimeline();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load inventory when filters or pagination change
  useEffect(() => {
    if (activeTab === 'inventory') {
      getAllCallIDs({ ...filters, page: inventoryPage, limit: inventoryLimit });
    }
  }, [filters, inventoryPage, inventoryLimit, getAllCallIDs, activeTab]);

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
    (tab: TabType) => {
      setActiveTab(tab);
      // Update URL with the new tab
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (tab === 'dashboard') {
          newParams.delete('tab'); // Remove tab param for default tab
        } else {
          newParams.set('tab', tab);
        }
        return newParams;
      });
      // Data refresh is handled by useEffect watching activeTab
    },
    [setSearchParams]
  );

  const handleFilterChange = useCallback((filterName: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    setInventoryPage(1); // Reset to first page when filters change
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: '',
      stateFIPS: '',
      callerName: '',
      phoneNumber: '',
      inUse: '',
    });
    setInventoryPage(1); // Reset to first page when filters are cleared
  }, []);

  const handleRefresh = useCallback(() => {
    switch (activeTab) {
      case 'dashboard':
        refetchDashboard();
        refetchActiveAssignments();
        refetchRecentActivity();
        break;
      case 'inventory':
        getAllCallIDs({ ...filters, page: inventoryPage, limit: inventoryLimit });
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
    inventoryPage,
    inventoryLimit,
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

  // Pagination handlers
  const handleInventoryPageChange = useCallback((page: number) => {
    setInventoryPage(page);
  }, []);

  const handleInventoryLimitChange = useCallback((limit: number) => {
    setInventoryLimit(limit);
    setInventoryPage(1); // Reset to first page when limit changes
  }, []);

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
        toast.success(`Call ID ${data.phoneNumber} created successfully`);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to create call ID:', error);
        const errorMsg = error?.data?.message || 'Failed to create call ID';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [createCallID, closeCreateModal, handleRefresh, toast]
  );

  const handleUpdateCallID = useCallback(
    async (id: number, data: any) => {
      try {
        await updateCallID({ id, data }).unwrap();
        closeEditModal();
        handleRefresh();
        toast.success('Call ID updated successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Failed to update call ID:', error);
        const errorMsg = error?.data?.message || 'Failed to update call ID';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [updateCallID, closeEditModal, handleRefresh, toast]
  );

  const handleDeleteCallID = useCallback(
    async (id: number) => {
      try {
        await deleteCallID(id).unwrap();
        closeDeleteModal();
        handleRefresh();
        toast.success('Call ID deleted successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Failed to delete call ID:', error);
        const errorMsg = error?.data?.message || 'Failed to delete call ID';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [deleteCallID, closeDeleteModal, handleRefresh, toast]
  );

  const handleAssignCallID = useCallback(
    async (data: any) => {
      try {
        // Use the updateProjectSlot mutation - dates come from Projects table
        await updateProjectSlot({
          projectId: data.projectId,
          slotName: data.slotName,
          phoneNumberId: data.phoneNumberId,
        }).unwrap();

        closeAssignModal();
        handleRefresh();
        toast.success(`Call ID assigned to ${data.slotName} slot`);
        return { success: true };
      } catch (error: any) {
        console.error('Failed to assign call ID:', error);
        const errorMsg = error?.data?.message || 'Failed to assign call ID';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [updateProjectSlot, closeAssignModal, handleRefresh, toast]
  );

  const handleEndAssignment = useCallback(
    async (projectId: string, phoneNumberId: number) => {
      try {
        await endAssignment({ projectId, phoneNumberId }).unwrap();
        handleRefresh();
        toast.success('Assignment ended successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Failed to end assignment:', error);
        const errorMsg = error?.data?.message || 'Failed to end assignment';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [endAssignment, handleRefresh, toast]
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
        await handleEndAssignment(
          assignment.ProjectID,
          assignment.PhoneNumberID
        );
        // Toast is handled in handleEndAssignment
      }
    },
    [handleEndAssignment]
  );

  const handleSwapSubmit = useCallback(
    async (newPhoneNumberId: number) => {
      if (!selectedAssignment) {
        toast.error('No assignment selected');
        return { success: false, error: 'No assignment selected' };
      }

      try {
        await reassignCallID({
          projectId: selectedAssignment.ProjectID,
          oldPhoneNumberId: selectedAssignment.PhoneNumberID,
          newPhoneNumberId: newPhoneNumberId,
        }).unwrap();

        closeSwapModal();
        handleRefresh();
        toast.success('Call ID reassigned successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Failed to reassign number:', error);
        const errorMsg = error?.data?.message || 'Failed to reassign number';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [selectedAssignment, reassignCallID, closeSwapModal, handleRefresh, toast]
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
        toast.success('Assignment updated successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Error updating assignment:', error);
        const errorMsg = error.data?.message || 'Failed to update assignment';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [
      updateAssignment,
      selectedProjectHistory,
      handleViewProjectHistory,
      closeEditAssignmentModal,
      toast,
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
        toast.success('Call IDs swapped successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Error swapping assignment:', error);
        const errorMsg = error.data?.message || 'Failed to swap assignment';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [
      swapAssignment,
      refetchProjects,
      selectedProjectHistory,
      handleViewProjectHistory,
      closeSwapModal,
      toast,
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
        toast.success('Call ID assigned to project successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Error assigning call ID:', error);
        const errorMsg = error.data?.message || 'Failed to assign call ID';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [
      assignCallID,
      selectedProjectHistory,
      handleViewProjectHistory,
      closeAssignToProjectModal,
      toast,
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
      phoneNumberId: number | null
    ) => {
      try {
        // Dates are now retrieved from the Projects table
        await updateProjectSlot({
          projectId,
          slotName,
          phoneNumberId,
        }).unwrap();

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

        toast.success(`${slotName} slot updated successfully`);
        return { success: true };
      } catch (error: any) {
        console.error('[handleAssignSlot] Error:', error);
        const errorMsg = error?.data?.message || 'Failed to assign slot';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [updateProjectSlot, refetchActiveAssignments, selectedProjectSlots, toast]
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

        toast.success('Slot removed successfully');
        return { success: true };
      } catch (error: any) {
        console.error('Error removing slot:', error);
        const errorMsg = error?.data?.message || 'Failed to remove slot';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [endAssignment, refetchActiveAssignments, selectedProjectSlots, toast]
  );

  // Note: Dates are now managed in the Projects table, not CallIDUsage
  // This function is kept for backward compatibility but now just shows a message
  const handleUpdateSlotDates = useCallback(
    async (
      projectId: string,
      _phoneNumberId: number,
      _startDate: string,
      _endDate: string
    ) => {
      // Dates are now stored in the Projects table
      // To change dates, users should edit the project in Project Management
      toast.info(`Project dates should be edited in Project Management for project ${projectId}`);
      return { success: false, error: 'Dates are now managed in the Projects table' };
    },
    [toast]
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
    paginationInfo,
    inventoryPage,
    inventoryLimit,
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

    // Inventory pagination
    handleInventoryPageChange,
    handleInventoryLimitChange,

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
