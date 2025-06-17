import { useState, useEffect, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../../../features/auth/authSlice';
import {
  useLazyGetQuotasQuery, // Reverted to useLazyGetQuotasQuery
  useLazyGetProjectListQuery,
} from '../../../features/quotasApiSlice';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams

// Types
interface DecodedToken {
  UserInfo: {
    username: string;
    roles: number[];
  };
}

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

// Constants
const EXTERNAL_ROLE_ID = 4;
const PROJECT_ID_QUERY_PARAM = 'projectId'; // Constant for the query parameter name

const useQuotaManagementLogic = () => {
  // State
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [quotas, setQuotas] = useState<QuotaData>({});
  const [visibleStypes, setVisibleStypes] = useState<VisibleStypes>({});

  // Routing hook to manage URL query parameters
  const [searchParams, setSearchParams] = useSearchParams();

  // Selectors
  const token = useSelector(selectCurrentToken);

  // Memoized user info extraction from the JWT token
  const userInfo = useMemo(() => {
    if (!token) return { roles: [], username: '', isInternalUser: true };

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const roles = decoded?.UserInfo?.roles ?? [];
      const username = decoded?.UserInfo?.username ?? '';
      // Determine if the user is internal based on the presence of EXTERNAL_ROLE_ID
      const isInternalUser = !roles.includes(EXTERNAL_ROLE_ID);

      return { roles, username, isInternalUser };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { roles: [], username: '', isInternalUser: true };
    }
  }, [token]);

  // RTK Query hooks for fetching quota data and project list lazily
  const [
    getQuotas,
    {
      data: quotaData,
      isFetching: quotaDataIsFetching,
      error: quotaDataError,
    },
  ] = useLazyGetQuotasQuery();

  const [
    getProjectList,
    {
      data: projectList,
      isFetching: projectListIsFetching,
      error: projectListError,
    },
  ] = useLazyGetProjectListQuery();

  // Memoized list of project options for a dropdown/selector
  const projectListOptions = useMemo((): ProjectOption[] => {
    if (!projectList || projectListIsFetching) return [];

    return projectList.map((item: any) => ({
      value: item.projectId,
      label: item.projectName,
    }));
  }, [projectList, projectListIsFetching]);

  // Effect to initialize selectedProject state from the URL query parameter on component mount
  useEffect(() => {
    const projectIdFromUrl = searchParams.get(PROJECT_ID_QUERY_PARAM);
    if (projectIdFromUrl) {
      setSelectedProject(projectIdFromUrl);
    }
  }, [searchParams]); // Re-run if searchParams object itself changes (e.g., external URL navigation)

  // Effect to fetch the list of projects when user info becomes available
  useEffect(() => {
    const fetchParams = userInfo.isInternalUser
      ? {} // No specific user ID needed for internal users
      : { userId: userInfo.username }; // Filter by username for external users

    if (userInfo.username || userInfo.isInternalUser) {
      getProjectList(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getProjectList]);

  // Effect to process and set quota data and visible stypes when quotaData changes
  useEffect(() => {
    if (quotaData) {
      try {
        setQuotas(quotaData.data || {});

        const processedStypes: VisibleStypes = {
          blankSpace_6: {
            blankSpace_1: 'Label',
            Total: ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'],
          },
        };

        // Logic to sort the stypes based on a predefined order
        const subTypeOrder = ['Landline', 'Cell', 'T2W', 'Panel', 'Email', 'Mailer'];

        // Iterate through API's visibleStypes to populate processedStypes
        Object.entries(quotaData.visibleStypes || {}).forEach(([type, entries]) => {
          processedStypes[type] = { Total: ['Freq', 'Freq%'] }; // Initialize Total for each type

          if (Array.isArray(entries)) {
            // Filter and sort entries based on subTypeOrder
            const sortedEntries = subTypeOrder.filter(orderKey =>
              (entries as string[]).includes(orderKey)
            );

            // Add sorted entries to processedStypes
            sortedEntries.forEach((entry: string) => {
              processedStypes[type][entry] = ['Status', 'Freq', 'Freq%'];
            });
          }
        });

        setVisibleStypes(processedStypes);
      } catch (error) {
        console.error('Error processing quota data:', error);
        setQuotas({});
        setVisibleStypes({});
      }
    }
  }, [quotaData]);

  // Effect to fetch quotas and set up polling based on selectedProject and userInfo
  useEffect(() => {
    if (!selectedProject) {
      setQuotas({}); // Clear data when no project is selected
      // If no project is selected, also remove the projectId from the URL
      if (searchParams.has(PROJECT_ID_QUERY_PARAM)) {
        setSearchParams(prev => {
          prev.delete(PROJECT_ID_QUERY_PARAM);
          return prev;
        }, { replace: true }); // Use replace to avoid adding to browser history
      }
      return;
    }

    // Update the URL with the selected project ID
    setSearchParams(prev => {
      prev.set(PROJECT_ID_QUERY_PARAM, selectedProject);
      return prev;
    }, { replace: true }); // Use replace to update the URL without pushing a new history entry

    const fetchParams = {
      projectId: selectedProject,
      isInternalUser: userInfo.isInternalUser,
    };

    // Trigger an immediate fetch for the selected project's quotas
    getQuotas(fetchParams).catch(console.error);

    // Set up a polling interval to refetch quotas periodically
    const intervalId = setInterval(() => {
      // Only fetch if a previous fetch is not already in progress
      if (!quotaDataIsFetching) {
        getQuotas(fetchParams).catch(console.error);
      }
    }, 15000); // Poll every 15 seconds

    // Cleanup function: clear the interval when the component unmounts or dependencies change
    return () => clearInterval(intervalId);

    // Dependencies for this effect:
    // selectedProject: to re-run when a new project is selected
    // userInfo.isInternalUser: to re-run if user type changes (though unlikely during a session)
    // getQuotas: RTK Query's lazy query trigger
    // setSearchParams, searchParams: to interact with the URL query parameters
  }, [selectedProject, userInfo.isInternalUser, getQuotas, setSearchParams, searchParams]);

  // Callback for handling project selection changes from a UI component (e.g., dropdown)
  const handleProjectChange = useCallback((selected: ProjectOption | null) => {
    // Update the local state; the useEffect above will react to this change and update the URL
    setSelectedProject(selected?.value || '');
  }, []);

  // Callback to manually refresh quota data (e.g., for a "Refresh" button)
  const refreshData = useCallback(() => {
    if (selectedProject) {
      const fetchParams = {
        projectId: selectedProject,
        isInternalUser: userInfo.isInternalUser,
      };
      getQuotas(fetchParams).catch(console.error);
    }
  }, [selectedProject, userInfo.isInternalUser, getQuotas]);

  // Memoized boolean to indicate overall loading state (initial fetch)
  const isLoading = useMemo(() => {
    // isLoading is true if project list is fetching, or if quota data is fetching
    // AND no quotas have been loaded yet (distinguishing initial load from refetches)
    return projectListIsFetching || (quotaDataIsFetching && !Object.keys(quotas).length);
  }, [quotaDataIsFetching, projectListIsFetching, quotas]);

  // Memoized boolean to indicate if data is currently being refetched (after initial load)
  const isRefetching = useMemo(() => {
    return quotaDataIsFetching && Object.keys(quotas).length > 0;
  }, [quotaDataIsFetching, quotas]);

  // Memoized error state (combines errors from both RTK Query hooks)
  const error = useMemo(() => {
    return quotaDataError || projectListError;
  }, [quotaDataError, projectListError]);

  return {
    // Data
    selectedProject,
    quotas,
    visibleStypes,
    projectListOptions,
    userInfo,

    // Loading states
    isLoading,
    isRefetching, // New flag for refetching state

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
