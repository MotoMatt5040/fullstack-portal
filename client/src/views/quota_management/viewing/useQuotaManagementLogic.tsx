import { useState, useEffect, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../../../features/auth/authSlice';
import {
  useLazyGetQuotasQuery,
  useLazyGetProjectListQuery,
} from '../../../features/quotasApiSlice';

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

const useQuotaManagementLogic = () => {
  // RTK Query hooks
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

  // State
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [quotas, setQuotas] = useState<QuotaData>({});
  const [visibleStypes, setVisibleStypes] = useState<VisibleStypes>({});
  
  // Selectors
  const token = useSelector(selectCurrentToken);

  // Memoized user info extraction
  const userInfo = useMemo(() => {
    if (!token) return { roles: [], username: '', isInternalUser: true };

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const roles = decoded?.UserInfo?.roles ?? [];
      const username = decoded?.UserInfo?.username ?? '';
      const isInternalUser = !roles.includes(EXTERNAL_ROLE_ID);

      return { roles, username, isInternalUser };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { roles: [], username: '', isInternalUser: true };
    }
  }, [token]);

  // Memoized project list options
  const projectListOptions = useMemo((): ProjectOption[] => {
    if (!projectList || projectListIsFetching) return [];
    
    return projectList.map((item: any) => ({
      value: item.projectId,
      label: item.projectName,
    }));
  }, [projectList, projectListIsFetching]);

  // Fetch project list on mount
  useEffect(() => {
    const fetchParams = userInfo.isInternalUser 
      ? {} 
      : { userId: userInfo.username };
    
    if (userInfo.username || userInfo.isInternalUser) {
      getProjectList(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getProjectList]);

  // Process quota data when it changes
  useEffect(() => {
    if (!quotaData) {
      setQuotas({});
      setVisibleStypes({});
      return;
    }

    try {
      // Set main quota data
      setQuotas(quotaData.data || {});

      // Process visible stypes with better structure
      const processedStypes: VisibleStypes = {
        blankSpace_6: {
          blankSpace_1: 'Label',
          Total: ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'],
        },
      };

      // Process each survey type
      Object.entries(quotaData.visibleStypes || {}).forEach(([type, entries]) => {
        processedStypes[type] = { 
          Total: ['Freq', 'Freq%'] 
        };
        
        if (Array.isArray(entries)) {
          entries.forEach((entry: string) => {
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
  }, [quotaData]);

  // Fetch quotas when project is selected
  useEffect(() => {
    if (!selectedProject) {
      setQuotas({});
      return;
    }

    const fetchParams = {
      projectId: selectedProject,
      isInternalUser: userInfo.isInternalUser,
    };

    getQuotas(fetchParams).catch(console.error);
  }, [selectedProject, userInfo.isInternalUser, getQuotas]);

  // Callbacks
  const handleProjectChange = useCallback((selected: ProjectOption | null) => {
    setSelectedProject(selected?.value || '');
  }, []);

  const refreshData = useCallback(() => {
    if (selectedProject) {
      const fetchParams = {
        projectId: selectedProject,
        isInternalUser: userInfo.isInternalUser,
      };
      getQuotas(fetchParams).catch(console.error);
    }
  }, [selectedProject, userInfo.isInternalUser, getQuotas]);

  // Loading states
  const isLoading = useMemo(() => {
    return quotaDataIsFetching || projectListIsFetching;
  }, [quotaDataIsFetching, projectListIsFetching]);

  // Error handling
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
    quotaDataIsFetching,
    projectListIsFetching,
    
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