// client/src/views/disposition_report/useDispositionReportLogic.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import { useLazyGetProjectListQuery } from '../../features/projectInfoApiSlice';
import {
  useLazyGetWebDispositionQuery,
  useLazyGetWebDropoutCountsQuery,
  useLazyGetPhoneDispositionQuery,
} from '../../features/dispositionApiSlice';
import { useSearchParams } from 'react-router-dom';

// Types
interface ProjectOption {
  value: string;
  label: string;
}

interface DispositionData {
  Sample?: number;
  Objective?: number;
  Responses?: number;
  AvgCompletionSeconds?: number;
  AvgCompletionTime?: string;
  CompletionRate?: string;
  [key: string]: any;
}

interface ChartDataItem {
  field: string;
  value: number;
  webValue?: number;
  phoneValue?: number;
}

type DataAvailability = 'none' | 'web-only' | 'phone-only' | 'both';

const EXTERNAL_ROLE_ID = 4;
const PROJECT_ID_QUERY_PARAM = 'projectId';
const POLLING_INTERVAL = 15000; // 15 seconds

const useDispositionReportLogic = () => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [webDispositionData, setWebDispositionData] =
    useState<DispositionData | null>(null);
  const [phoneDispositionData, setPhoneDispositionData] =
    useState<DispositionData | null>(null);
  const [webChartData, setWebChartData] = useState<ChartDataItem[]>([]);
  const [phoneChartData, setPhoneChartData] = useState<ChartDataItem[]>([]);
  const [combinedChartData, setCombinedChartData] = useState<ChartDataItem[]>(
    []
  );
  // Add state for web dropout counts chart data
  const [webDropoutChartData, setWebDropoutChartData] = useState<
    ChartDataItem[]
  >([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<any>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Use the selectUser selector
  const currentUser = useSelector(selectUser);

  // Memoized user info
  const userInfo = useMemo(() => {
    if (!currentUser) return { roles: [], username: '', isInternalUser: true };

    const isInternalUser = !currentUser.roles.includes(EXTERNAL_ROLE_ID);

    return {
      roles: currentUser.roles,
      username: currentUser.username,
      isInternalUser,
    };
  }, [currentUser]);

  // RTK Query hooks
  const [
    getProjectList,
    {
      data: projectList,
      isFetching: projectListIsFetching,
      error: projectListError,
    },
  ] = useLazyGetProjectListQuery();

  const [
    getWebDisposition,
    { data: webData, isFetching: webIsFetching, error: webError },
  ] = useLazyGetWebDispositionQuery();

  const [
    getWebDropoutCounts,
    {
      data: webCountsData,
      isFetching: webCountsIsFetching,
      error: webCountsError,
    },
  ] = useLazyGetWebDropoutCountsQuery();

  const [
    getPhoneDisposition,
    { data: phoneData, isFetching: phoneIsFetching, error: phoneError },
  ] = useLazyGetPhoneDispositionQuery();

  // Memoized list of project options
  const projectListOptions = useMemo((): ProjectOption[] => {
    if (!projectList || projectListIsFetching) return [];

    return projectList.map((item: any) => ({
      value: item.projectId,
      label: `${item.projectId} - ${item.projectName}`,
    }));
  }, [projectList, projectListIsFetching]);

  // Determine what data is available
  const dataAvailability = useMemo((): DataAvailability => {
    const hasWebData =
      webDispositionData && Object.keys(webDispositionData).length > 0;
    const hasPhoneData =
      phoneDispositionData && Object.keys(phoneDispositionData).length > 0;

    if (hasWebData && hasPhoneData) return 'both';
    if (hasWebData) return 'web-only';
    if (hasPhoneData) return 'phone-only';
    return 'none';
  }, [webDispositionData, phoneDispositionData]);

  // Transform disposition data to chart format
  const transformDispositionData = useCallback(
    (data: DispositionData): ChartDataItem[] => {
      const excludeKeys = [
        'Sample',
        'Objective',
        'Responses',
        'AvgCompletionSeconds',
        'AvgCompletionTime',
        'CompletionRate',
      ];

      return Object.entries(data)
        .filter(
          ([key, value]) =>
            !excludeKeys.includes(key) && typeof value === 'number'
        )
        .map(([key, value]) => ({
          field: key,
          value: value as number,
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending
    },
    []
  );

  const transformWebDropoutData = useCallback(
    (data: any[]): ChartDataItem[] => {
      if (!data || !Array.isArray(data)) return [];

      const filtered = data.filter(
        (item) => item.CountOfDropouts && item.CountOfDropouts > 0
      );
      const total = filtered.reduce(
        (sum, item) => sum + item.CountOfDropouts,
        0
      );

      // Only show items that represent at least 2% of total dropouts
      const significantItems = filtered.filter(
        (item) => item.CountOfDropouts / total >= 0.005
      );

      // Group small items into "Other"
      const smallItems = filtered.filter(
        (item) => item.CountOfDropouts / total < 0.005
      );
      const otherCount = smallItems.reduce(
        (sum, item) => sum + item.CountOfDropouts,
        0
      );

      const mapped = significantItems.map((item) => ({
        field: item.HisLastDisplayedQuestionName || 'Unknown Question',
        value: item.CountOfDropouts,
      }));

      // Add "Other" category if there are small items
      if (otherCount > 0) {
        mapped.push({
          field: 'Other',
          value: otherCount,
        });
      }

      return mapped.sort((a, b) => b.value - a.value);
    },
    []
  );

  // Combine web and phone data for comparison
  const combineChartData = useCallback(
    (webData: ChartDataItem[], phoneData: ChartDataItem[]): ChartDataItem[] => {
      const combined = new Map<string, { web: number; phone: number }>();

      // Add web data
      webData.forEach((item) => {
        combined.set(item.field, { web: item.value, phone: 0 });
      });

      // Add phone data
      phoneData.forEach((item) => {
        const existing = combined.get(item.field);
        if (existing) {
          existing.phone = item.value;
        } else {
          combined.set(item.field, { web: 0, phone: item.value });
        }
      });

      // Convert to array format
      return Array.from(combined.entries())
        .map(([field, values]) => ({
          field,
          value: values.web + values.phone,
          webValue: values.web,
          phoneValue: values.phone,
        }))
        .sort((a, b) => b.value - a.value); // Sort by total value descending
    },
    []
  );

  // Initialize from URL params
  useEffect(() => {
    const projectIdFromUrl = searchParams.get(PROJECT_ID_QUERY_PARAM);

    if (projectIdFromUrl && projectIdFromUrl !== selectedProject) {
      setSelectedProject(projectIdFromUrl);
    }
  }, []);

  // Fetch project list
  useEffect(() => {
    const fetchParams = userInfo.isInternalUser
      ? {}
      : { userId: userInfo.username };

    if (userInfo.username || userInfo.isInternalUser) {
      getProjectList(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getProjectList]);

  // Process web disposition data
  useEffect(() => {
    if (webData) {
      setWebDispositionData(webData);
      const transformed = transformDispositionData(webData);
      setWebChartData(transformed);
    } else {
      setWebDispositionData(null);
      setWebChartData([]);
    }
  }, [webData, transformDispositionData]);

  // Process web dropout counts data
  useEffect(() => {
    if (webCountsData) {
      const transformed = transformWebDropoutData(webCountsData);
      setWebDropoutChartData(transformed);
    } else {
      setWebDropoutChartData([]);
    }
  }, [webCountsData, transformWebDropoutData]);

  // Process phone disposition data
  useEffect(() => {
    if (phoneData) {
      setPhoneDispositionData(phoneData);
      const transformed = transformDispositionData(phoneData);
      setPhoneChartData(transformed);
    } else {
      setPhoneDispositionData(null);
      setPhoneChartData([]);
    }
  }, [phoneData, transformDispositionData]);

  // Combine chart data when both are available
  useEffect(() => {
    if (
      dataAvailability === 'both' &&
      webChartData.length > 0 &&
      phoneChartData.length > 0
    ) {
      const combined = combineChartData(webChartData, phoneChartData);
      setCombinedChartData(combined);
    } else {
      setCombinedChartData([]);
    }
  }, [webChartData, phoneChartData, dataAvailability, combineChartData]);

  // URL management
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);

    if (!selectedProject) {
      newSearchParams.delete(PROJECT_ID_QUERY_PARAM);
    } else if (searchParams.get(PROJECT_ID_QUERY_PARAM) !== selectedProject) {
      newSearchParams.set(PROJECT_ID_QUERY_PARAM, selectedProject);
    }

    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [selectedProject, searchParams, setSearchParams]);

  // Data fetching with polling
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedProject) {
      setWebDispositionData(null);
      setPhoneDispositionData(null);
      setWebChartData([]);
      setPhoneChartData([]);
      setCombinedChartData([]);
      setWebDropoutChartData([]);
      lastFetchParamsRef.current = null;
      return;
    }

    const fetchParams = {
      projectId: selectedProject,
      isInternalUser: userInfo.isInternalUser,
    };

    // Store current fetch params
    lastFetchParamsRef.current = fetchParams;

    // Fetch function - always try to fetch both types of data
    const fetchDispositionData = () => {
      // Only fetch if params haven't changed
      if (
        lastFetchParamsRef.current &&
        lastFetchParamsRef.current.projectId === fetchParams.projectId &&
        lastFetchParamsRef.current.isInternalUser === fetchParams.isInternalUser
      ) {
        // Always attempt to fetch both web and phone data
        getWebDisposition(fetchParams).catch(console.error);
        getWebDropoutCounts(fetchParams).catch(console.error);
        getPhoneDisposition(fetchParams).catch(console.error);
      }
    };

    // Initial fetch
    fetchDispositionData();

    // Set up polling
    intervalRef.current = setInterval(fetchDispositionData, POLLING_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    selectedProject,
    userInfo.isInternalUser,
    getWebDisposition,
    getWebDropoutCounts,
    getPhoneDisposition,
  ]);

  useEffect(() => {
    console.log('🔍 Raw webCountsData:', webCountsData);

    if (webCountsData) {
      const transformed = transformWebDropoutData(webCountsData);
      console.log('📊 Transformed webDropoutChartData:', transformed);
      setWebDropoutChartData(transformed);
    } else {
      console.log('❌ No webCountsData available');
      setWebDropoutChartData([]);
    }
  }, [webCountsData, transformWebDropoutData]);

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

  // Manual refresh
  const refreshData = useCallback(() => {
    if (selectedProject) {
      const fetchParams = {
        projectId: selectedProject,
        isInternalUser: userInfo.isInternalUser,
      };

      // Always try to refresh both types of data
      getWebDisposition(fetchParams).catch(console.error);
      getWebDropoutCounts(fetchParams).catch(console.error);
      getPhoneDisposition(fetchParams).catch(console.error);
    }
  }, [
    selectedProject,
    userInfo.isInternalUser,
    getWebDisposition,
    getWebDropoutCounts,
    getPhoneDisposition,
  ]);

  // Loading states
  const isLoading = useMemo(() => {
    if (!selectedProject) return false;

    // Initial loading - when we haven't received any data yet
    const hasInitialData = webDispositionData || phoneDispositionData;
    const isInitialLoad = !hasInitialData && (webIsFetching || phoneIsFetching);

    return projectListIsFetching || isInitialLoad;
  }, [
    projectListIsFetching,
    webIsFetching,
    phoneIsFetching,
    selectedProject,
    webDispositionData,
    phoneDispositionData,
  ]);

  const isRefetching = useMemo(() => {
    const hasExistingData = webDispositionData || phoneDispositionData;
    return (
      hasExistingData &&
      (webIsFetching || phoneIsFetching || webCountsIsFetching)
    );
  }, [
    webIsFetching,
    phoneIsFetching,
    webCountsIsFetching,
    webDispositionData,
    phoneDispositionData,
  ]);

  // Error state - only show error if both requests failed
  const error = useMemo(() => {
    if (projectListError) return projectListError;

    // Only consider it an error if both web and phone requests failed
    if (webError && phoneError) {
      return webError || phoneError;
    }

    return null;
  }, [projectListError, webError, phoneError]);

  // Get active chart data based on what's available
  const activeChartData = useMemo(() => {
    switch (dataAvailability) {
      case 'web-only':
        return webChartData;
      case 'phone-only':
        return phoneChartData;
      case 'both':
        return combinedChartData;
      default:
        return [];
    }
  }, [dataAvailability, webChartData, phoneChartData, combinedChartData]);

  // Get display title based on available data
  const displayTitle = useMemo(() => {
    switch (dataAvailability) {
      case 'web-only':
        return 'Web Disposition Overview';
      case 'phone-only':
        return 'Phone Disposition Overview';
      case 'both':
        return 'Combined Disposition Overview';
      default:
        return 'Disposition Overview';
    }
  }, [dataAvailability]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const webTotal = webChartData.reduce((sum, item) => sum + item.value, 0);
    const phoneTotal = phoneChartData.reduce(
      (sum, item) => sum + item.value,
      0
    );

    return {
      webTotal,
      phoneTotal,
      combinedTotal: webTotal + phoneTotal,
      webCompletionRate: webDispositionData?.CompletionRate || 'N/A',
      phoneCompletionRate: phoneDispositionData?.CompletionRate || 'N/A',
    };
  }, [webChartData, phoneChartData, webDispositionData, phoneDispositionData]);

  // Cleanup on unmount
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
    projectListOptions,
    userInfo,
    currentUser,
    dataAvailability,
    webDispositionData,
    phoneDispositionData,
    webChartData,
    phoneChartData,
    combinedChartData,
    activeChartData,
    displayTitle,
    summaryStats,
    // Add web dropout chart data
    webDropoutChartData,

    // Loading states
    isLoading,
    isRefetching,

    // Error states
    error,

    // Actions
    handleProjectChange,
    refreshData,
    setSelectedProject,
  };
};

export default useDispositionReportLogic;
