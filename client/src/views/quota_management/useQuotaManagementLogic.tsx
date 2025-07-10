import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useSelector } from 'react-redux';
// import { selectCurrentToken } from '../../features/auth/authSlice';
import { selectUser } from '../../features/auth/authSlice';
import {
  useLazyGetQuotasQuery
} from '../../features/quotasApiSlice';
import {
  useLazyGetProjectListQuery
} from '../../features/projectInfoApiSlice';
import { useSearchParams } from 'react-router-dom';
import { mdiPhoneReturnOutline } from '@mdi/js';

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

const EXTERNAL_ROLE_ID = 4;
const PROJECT_ID_QUERY_PARAM = 'projectId';

const useQuotaManagementLogic = () => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [quotas, setQuotas] = useState<QuotaData>({});
  const [visibleStypes, setVisibleStypes] = useState<VisibleStypes>({});
  // const [webDispositionData, setWebDispositionData] = useState();
  // const [chartData, setChartData] = useState<any>([{ field: '', value: 0 }]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<any>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // const token = useSelector(selectCurrentToken);
  const currentUser = useSelector(selectUser);

  // Memoized user info extraction from the JWT token
  const userInfo = useMemo(() => {
    if (!currentUser) return { roles: [], username: '', isInternalUser: true };
    
    const isInternalUser = !currentUser.roles.includes(EXTERNAL_ROLE_ID);
    
    return { 
      roles: currentUser.roles,
      username: currentUser.username,
      isInternalUser 
    };
  }, [currentUser]);

  // RTK Query hooks for fetching quota data and project list lazily
  const [
    getQuotas,
    { data: quotaData, isFetching: quotaDataIsFetching, error: quotaDataError },
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
      label: `${item.projectId} - ${item.projectName}`,
    }));
  }, [projectList, projectListIsFetching]);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get(PROJECT_ID_QUERY_PARAM);
    if (projectIdFromUrl && projectIdFromUrl !== selectedProject) {
      setSelectedProject(projectIdFromUrl);
    }
  }, []);

  useEffect(() => {
    const fetchParams = userInfo.isInternalUser
      ? {}
      : { userId: userInfo.username };

    if (userInfo.username || userInfo.isInternalUser) {
      getProjectList(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getProjectList]);

  // useEffect(() => {
  //   if (!webDispositionData) return;
  //   const excludeKeys = ['Sample', 'Objective', 'Responses', 'AvgCompletionSeconds', 'AvgCompletionTime','CompletionRate']
  //   const transformedData = Object.entries(webDispositionData)
  //   .filter(([key, value]) => !excludeKeys.includes(key))
  //   .map(([key, value]) => ({
  //     field: key,
  //     value: value,
  //   }));

  //   setChartData(transformedData);
  //   console.log(transformedData)
  // }, [webDispositionData]);

  useEffect(() => {
    if (quotaData) {
      try {
        setQuotas(() => quotaData.data || {});
        // setWebDispositionData(quotaData.webDispositionData || {});
        // console.log(quotaData.webDispositionData);

        const baseStypes = {
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
        Object.entries(quotaData.visibleStypes || {}).forEach(
          ([type, entries]) => {
            count++;
            processedStypes[type] = { Total: ['Freq', 'Freq%'] };

            if (Array.isArray(entries)) {
              const sortedEntries = subTypeOrder.filter((orderKey) =>
                (entries as string[]).includes(orderKey)
              );

              sortedEntries.forEach((entry: string) => {
                processedStypes[type][entry] = ['Status', 'Freq', 'Freq%'];
              });
            }
          }
        );

        console.log(processedStypes)

        count === 1
          ? setVisibleStypes(baseStypes)
          : setVisibleStypes(processedStypes);
      } catch (error) {
        console.error('Error processing quota data:', error);
        setQuotas({});
        setVisibleStypes({});
      }
    }
  }, [quotaData]);

  // Separate effect for URL management
  useEffect(() => {
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

  // Data fetching with proper cleanup
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedProject) {
      setQuotas({});
      setVisibleStypes({});
      // setChartData([]);
      lastFetchParamsRef.current = null;
      return;
    }

    const fetchParams = {
      projectId: selectedProject,
      isInternalUser: userInfo.isInternalUser,
    };

    // Store current fetch params
    lastFetchParamsRef.current = fetchParams;

    // Create fetch function that uses current params
    const fetchQuotas = () => {
      // Only fetch if params haven't changed
      if (
        lastFetchParamsRef.current &&
        lastFetchParamsRef.current.projectId === fetchParams.projectId &&
        lastFetchParamsRef.current.isInternalUser === fetchParams.isInternalUser
      ) {
        getQuotas(fetchParams).catch(console.error);
      }
    };

    // Initial fetch
    fetchQuotas();

    // Set up polling
    intervalRef.current = setInterval(fetchQuotas, 15000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedProject, userInfo.isInternalUser, getQuotas]);

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

  // Callback to manually refresh quota data
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

  // Memoized boolean to indicate overall loading state (initial fetch)
  const isLoading = useMemo(() => {
    return (
      projectListIsFetching ||
      (quotaDataIsFetching && Object.keys(quotas).length === 0)
    );
  }, [quotaDataIsFetching, projectListIsFetching, quotas]);

  // Memoized boolean to indicate if data is currently being refetched (after initial load)
  const isRefetching = useMemo(() => {
    return quotaDataIsFetching && Object.keys(quotas).length > 0;
  }, [quotaDataIsFetching, quotas]);

  // Memoized error state
  const error = useMemo(() => {
    return quotaDataError || projectListError;
  }, [quotaDataError, projectListError]);

  // FIXED: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Data
    selectedProject,
    quotas,
    visibleStypes,
    projectListOptions,
    userInfo,
    // webDispositionData,
    // chartData,

    // Loading states
    isLoading,
    isRefetching,

    // Error states
    error,

    // Actions
    handleProjectChange, // Use optimized callback
    refreshData,

    // Legacy support (can be removed after refactoring consumers)
    setSelectedProject,
  };
};

export default useQuotaManagementLogic;
