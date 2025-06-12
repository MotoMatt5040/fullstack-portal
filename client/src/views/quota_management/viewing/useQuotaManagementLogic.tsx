import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../../../features/auth/authSlice';
import {
  useLazyGetQuotasQuery,
  useLazyGetProjectListQuery,
} from '../../../features/quotasApiSlice';

type FetchFunction = (params: object) => Promise<any>;

const useQuotaManagementLogic = () => {
  const [
    getQuotas,
    {
      data: quotaData,
      isFetching: quotaDataIsFetching,
      refetch: refetchQuotas,
    },
  ] = useLazyGetQuotasQuery();
  const [
    getProjectList,
    {
      data: projectList,
      isFetching: projectListIsFetching,
      refetch: refetchProjectList,
    },
  ] = useLazyGetProjectListQuery();
  // 	useGetProjectListQuery('');
  const [projectListOptions, setProjectListOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [userRoles, setUserRoles] = useState<[]>([]);
  const [isInternalUser, setIsInternalUser] = useState(false);
  const token = useSelector(selectCurrentToken);
  const [visibleStypes, setVisibleStypes] = useState<string[]>([]);
  // const [showMainColumnGroups, setShowMainColumnGroups] = useState(false);
  // const [showSubColumnGroups, setShowSubColumnGroups] = useState(false);
  const [quotas, setQuotas] = useState([]);

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const roles = decoded?.UserInfo?.roles ?? [];
        const username = decoded?.UserInfo?.username ?? '';
        setUserRoles(roles);

        if (roles.includes(4)) {
          setIsInternalUser(false);
          fetchData(getProjectList, { userId: username });
          // console.log('User is not internal');
        } else {
          setIsInternalUser(true);
          fetchData(getProjectList, {});
          // console.log('User is internal');
        }
      } catch (err) {
        console.error('Invalid token', err);
      }
    }
  }, []);

  useEffect(() => {
    if (projectListIsFetching) return;
    if (projectList && projectList.length > 0) {
      const options = projectList.map((item: any) => ({
        value: item.projectId,
        label: item.projectName,
      }));
      setProjectListOptions(options);
    } else {
      setProjectListOptions([]);
    }
  }, [projectList]);

  useEffect(() => {
    if (!quotaData) return;

    setQuotas(quotaData.data);
    console.log('Quota Data:', quotaData);
    const stypes = {
      blankSpace_6: {
        blankSpace_1: 'Label',
        Total: ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'],
      },
    };

    Object.keys(quotaData.visibleStypes).forEach((type) => {
      stypes[type] = { Total: ['Freq', 'Freq%'] };
      quotaData.visibleStypes[type].forEach((entry: string) => {
        stypes[type][entry] = ['Status', 'Freq', 'Freq%'];
      });
    });

    console.log(JSON.stringify(stypes, null, 2));
    setVisibleStypes(stypes);
  }, [quotaData]);

  useEffect(() => {
    if (selectedProject) {
      fetchData(getQuotas, { projectId: selectedProject, isInternalUser });
    } else {
      setQuotas([]);
    }
  }, [selectedProject]);

  const fetchData = async (refetch: FetchFunction, params: Object) => {
    try {
      const res = await refetch(params);
    } catch (error) {
      console.error('Error fetching quotas:', error);
    }
  };

  return {
    selectedProject,
    setSelectedProject,
    userRoles,
    // isInternalUser,
    quotas,
    quotaDataIsFetching,
    // setShowFilter,
    // toggleSubColumn,
    projectListOptions,
    visibleStypes,
  };
};

export default useQuotaManagementLogic;
