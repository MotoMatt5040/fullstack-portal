import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import { useLazyGetQuotasQuery, useLazyGetQuotaProjectsQuery } from './quotasApiSlice';
import { useSearchParams } from 'react-router-dom';
import { useQuotaSSE } from './useQuotaSSE';

// Types
interface ProjectOption {
  value: string;
  label: string;
}

interface VisibleStypes {
  [key: string]: {
    [subKey: string]: string | string[];
  };
}

interface QuotaData {
  [key: string]: any;
}

const EXTERNAL_ROLE_ID = 4;
const PROJECT_ID_QUERY_PARAM = 'projectId';

const processVisibleStypes = (rawVisibleStypes: Record<string, any>): { stypes: VisibleStypes; useBase: boolean } => {
  const baseStypes: VisibleStypes = {
    Project: {
      blankSpace_1: 'Label',
      Total: ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'],
    },
  };

  const processedStypes: VisibleStypes = {
    blankSpace_6: {
      blankSpace_1: 'Label',
      Total: ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'],
    },
  };

  const subTypeOrder = [
    'Landline',
    'Cell',
    'Panel',
    'T2W',
    'Email',
    'Mailer',
  ];

  let count = 0;
  Object.entries(rawVisibleStypes || {}).forEach(
    ([type, entries]) => {
      processedStypes[type] = { Total: ['Freq', 'Freq%'] };

      if (Array.isArray(entries)) {
        const sortedEntries = subTypeOrder.filter((orderKey) =>
          (entries as string[]).includes(orderKey)
        );

        sortedEntries.forEach((entry: string) => {
          count++;
          processedStypes[type][entry] = ['Status', 'Freq', 'Freq%'];
        });
      }
    }
  );

  return {
    stypes: count === 1 ? baseStypes : processedStypes,
    useBase: count === 1,
  };
};

const useQuotaManagementLogic = () => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [quotas, setQuotas] = useState<QuotaData>({});
  const [visibleStypes, setVisibleStypes] = useState<VisibleStypes>({});
  const [sseError, setSseError] = useState<any>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const currentUser = useSelector(selectUser);

  // Memoized user info extraction from the JWT token
  const userInfo = useMemo(() => {
    if (!currentUser) return { roles: [], username: '', isInternalUser: true };

    const isInternalUser = !currentUser.roles.includes(EXTERNAL_ROLE_ID);

    return {
      roles: currentUser.roles,
      username: currentUser.username,
      isInternalUser,
    };
  }, [currentUser]);

  // RTK Query hooks - lazy query kept for manual refresh
  const [
    getQuotas,
    { data: quotaData, isFetching: quotaDataIsFetching, error: quotaDataError },
  ] = useLazyGetQuotasQuery();

  const [
    getQuotaProjects,
    {
      data: projectList,
      isFetching: projectListIsFetching,
      error: projectListError,
    },
  ] = useLazyGetQuotaProjectsQuery();

  // SSE callback: process incoming quota data
  const handleSSEData = useCallback((data: { visibleStypes: Record<string, any>; data: Record<string, any> }) => {
    try {
      setQuotas(data.data || {});
      const { stypes } = processVisibleStypes(data.visibleStypes);
      setVisibleStypes(stypes);
      setSseError(null);
    } catch (error) {
      console.error('Error processing SSE quota data:', error);
      setQuotas({});
      setVisibleStypes({});
    }
  }, []);

  const handleSSEError = useCallback((error: any) => {
    setSseError(error);
  }, []);

  // SSE connection - replaces setInterval polling
  const { isConnected } = useQuotaSSE({
    projectId: selectedProject || null,
    isInternalUser: userInfo.isInternalUser,
    onData: handleSSEData,
    onError: handleSSEError,
  });

  // Memoized list of project options for a dropdown/selector
  const projectListOptions = useMemo((): ProjectOption[] => {
    if (!projectList || projectListIsFetching) return [];

    // Sorting is handled by SQL query (ORDER BY projectid DESC)
    return projectList.map((item: any) => ({
      value: item.projectid,
      label: `${item.projectid} - ${item.projectname}`,
    }));
  }, [projectList, projectListIsFetching]);

  // Track if we've already initialized from URL to prevent re-running
  const initializedFromUrlRef = useRef(false);

  // Initialize selected project from URL once project list is available
  useEffect(() => {
    // Only run once and only when project list has loaded
    if (initializedFromUrlRef.current || projectListOptions.length === 0) return;

    const projectIdFromUrl = searchParams.get(PROJECT_ID_QUERY_PARAM);
    if (projectIdFromUrl) {
      // Verify the project exists in the list
      const projectExists = projectListOptions.some(opt => opt.value === projectIdFromUrl);
      if (projectExists && projectIdFromUrl !== selectedProject) {
        setSelectedProject(projectIdFromUrl);
      }
      initializedFromUrlRef.current = true;
    } else {
      // No URL param, mark as initialized anyway
      initializedFromUrlRef.current = true;
    }
  }, [projectListOptions, searchParams]);

  useEffect(() => {
    const fetchParams = userInfo.isInternalUser
      ? {}
      : { userId: userInfo.username };

    if (userInfo.username || userInfo.isInternalUser) {
      getQuotaProjects(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getQuotaProjects]);

  // Process data from manual refresh (RTK Query)
  useEffect(() => {
    if (quotaData) {
      try {
        setQuotas(quotaData.data || {});
        const { stypes } = processVisibleStypes(quotaData.visibleStypes);
        setVisibleStypes(stypes);
      } catch (error) {
        console.error('Error processing quota data:', error);
        setQuotas({});
        setVisibleStypes({});
      }
    }
  }, [quotaData]);

  // Clear data when project is deselected
  useEffect(() => {
    if (!selectedProject) {
      setQuotas({});
      setVisibleStypes({});
    }
  }, [selectedProject]);

  // Separate effect for URL management
  useEffect(() => {
    // Don't modify URL until we've finished initializing from it
    if (!initializedFromUrlRef.current) return;

    if (!selectedProject) {
      if (searchParams.has(PROJECT_ID_QUERY_PARAM)) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete(PROJECT_ID_QUERY_PARAM);
        setSearchParams(newSearchParams, { replace: true });
      }
    } else {
      if (searchParams.get(PROJECT_ID_QUERY_PARAM) !== selectedProject) {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set(PROJECT_ID_QUERY_PARAM, selectedProject);
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [selectedProject, searchParams, setSearchParams]);

  // Callback for handling project selection changes
  const handleProjectChange = useCallback(
    (selected: ProjectOption | null) => {
      const newValue = selected?.value || '';
      if (newValue !== selectedProject) {
        setSelectedProject(newValue);
      }
    },
    [selectedProject]
  );

  // Manual refresh via REST endpoint
  const refreshData = useCallback(() => {
    if (selectedProject && !quotaDataIsFetching) {
      const fetchParams = {
        projectId: selectedProject,
        isInternalUser: userInfo.isInternalUser,
      };
      getQuotas(fetchParams).catch(console.error);
    }
  }, [
    selectedProject,
    userInfo.isInternalUser,
    getQuotas,
    quotaDataIsFetching,
  ]);

  // Loading state: project list loading or waiting for first SSE data
  const isLoading = useMemo(() => {
    return (
      projectListIsFetching ||
      (selectedProject !== '' && Object.keys(quotas).length === 0 && !sseError)
    );
  }, [projectListIsFetching, selectedProject, quotas, sseError]);

  // Refetching state: manual refresh in progress with existing data
  const isRefetching = useMemo(() => {
    return quotaDataIsFetching && Object.keys(quotas).length > 0;
  }, [quotaDataIsFetching, quotas]);

  // Memoized error state
  const error = useMemo(() => {
    return quotaDataError || projectListError || sseError;
  }, [quotaDataError, projectListError, sseError]);

  return {
    // Data
    selectedProject,
    quotas,
    visibleStypes,
    projectListOptions,
    userInfo,

    // Loading states
    isLoading,
    isRefetching,
    isConnected,

    // Error states
    error,

    // Actions
    handleProjectChange,
    refreshData,

    // Legacy support (can be removed after refactoring consumers)
    setSelectedProject,
  };
};

export default useQuotaManagementLogic;
