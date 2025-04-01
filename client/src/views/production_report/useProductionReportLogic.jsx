import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { parseDate } from '@internationalized/date';

import { setProjectData } from '../../features/production_report/productionReportSlice';
import {
  useLazyGetProductionReportQuery,
  useGetProjectsInDateRangeQuery,
} from '../../features/production_report/productionReportApiSlice';

const useProductionReportLogic = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [projectIds, setprojectIds] = useState([]);
  const [projectIdOptions, setprojectIdOptions] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSuccess, setIsSuccess] = useState(false);
  const [chartData, setChartData] = useState([
    { field: 'ON-CPH', value: 0 },
    { field: 'ON-VAR', value: 0 },
    { field: 'OFF-CPH', value: 0 },
    { field: 'ZERO-CMS', value: 0 },
  ]);
  const [avgCPH, setAvgCPH] = useState(0);
  const [allProjectsToggle, setAllProjectsToggle] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [value, setValue] = useState({ start: parseDate(today), end: parseDate(today) });

  const [getProductionReport, { data }] = useLazyGetProductionReportQuery();
  const { data: projectsData, refetch: refetchProjects } = useGetProjectsInDateRangeQuery({
    startDate,
    endDate,
  });

  useEffect(() => {
    if (projectIds.length > 0) {
      fetchData();
    }
  }, [projectIds]);

  useEffect(() => {
    if (data) {
      const totalHours = data.reduce((acc, curr) => acc + curr.hrs, 0);
      const totalCMS = data.reduce((acc, curr) => acc + curr.cms, 0);
      setAvgCPH((totalCMS / totalHours).toFixed(2));
    }
  }, [data]);

  useEffect(() => {
    if (data) {
      const offCPH = data.reduce((acc, curr) => acc + (curr.cph < avgCPH * 0.8 ? curr.hrs : 0), 0).toFixed(2);
      const zeroCMS = data.reduce((acc, curr) => acc + (curr.cms === 0 ? curr.hrs : 0), 0).toFixed(2);
      const onCPH = data.reduce((acc, curr) => acc + (curr.cph >= avgCPH ? curr.hrs : 0), 0).toFixed(2);
      const onVAR = data.reduce((acc, curr) => acc + (curr.cph >= avgCPH * 0.8 && curr.cph < avgCPH ? curr.hrs : 0), 0).toFixed(2);

      setChartData([
        { field: 'ON-CPH', value: onCPH },
        { field: 'ON-VAR', value: onVAR },
        { field: 'OFF-CPH', value: offCPH },
        { field: 'ZERO-CMS', value: zeroCMS },
      ]);
    }
  }, [avgCPH]);

  useEffect(() => {
    refetchProjects();

    if (projectsData) {
      const options = projectsData.map((project) => ({
        value: project.projectId,
        label: project.projectId,
      }));
      if (allProjectsToggle) {
        setprojectIds(options.map((option) => option.value));
      } else {
        const filteredprojectIds = projectIds.filter((id) =>
          options.some((option) => option.value === id)
        );
        setprojectIds(filteredprojectIds);
      }
      setprojectIdOptions(options);
    }
  }, [value]);

  useEffect(() => {
    if (allProjectsToggle) {
      setprojectIds(projectIdOptions.map((option) => option.value));
    }
  }, [allProjectsToggle]);

  const fetchData = async () => {
    try {
      const result = await getProductionReport({ projectIds, startDate, endDate });
      dispatch(setProjectData({ projectIds, startDate, endDate }));

      if (result?.data) {
        setIsSuccess(true);
        navigate(`/productionreport/tables?projectIds=${projectIds}&startDate=${startDate}&enddate=${endDate}`);
      } else {
        setIsSuccess(false);
      }
    } catch (err) {
      console.error(err);
      setIsSuccess(false);
    }
  };

  const handleToggleAllProjects = () => setAllProjectsToggle((prev) => !prev);

  const handleChangeDate = (e) => {
    setValue(e);
    setStartDate(e.start.toString());
    setEndDate(e.end.toString());
    refetchProjects();
  };

  const handleSelectProjects = (selectedOptions) => {
    if (selectedOptions.length === 0) {
      setChartData([
        { field: 'ON-CPH', value: 0 },
        { field: 'ON-VAR', value: 0 },
        { field: 'OFF-CPH', value: 0 },
        { field: 'ZERO-CMS', value: 0 },
      ]);
    }
    setprojectIds(selectedOptions.map((option) => option.value
    ));
  }

  return {
    projectIds,
    setprojectIds,
    projectIdOptions,
    setprojectIdOptions,
    startDate,
    endDate,
    value,
    setValue,
    allProjectsToggle,
    handleToggleAllProjects,
    handleChangeDate,
    chartData,
    avgCPH,
    setAvgCPH,
    isSuccess,
    data,
    fetchData,
    handleSelectProjects
  };
};

export default useProductionReportLogic;
