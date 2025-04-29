import React, { useState, useEffect } from 'react';
import { useGetReportQuery } from '../../features/reportsApiSlice';
import { useSearchParams } from 'react-router-dom';
import QueryHelper from '../../utils/QueryHelper';

interface ChartData {
  field: string;
  value: string;
}

interface TotalData {
  Total: string;
  'ON-CPH': string;
  'ON-VAR': string;
  'OFF-CPH': string;
  'ZERO-CMS': string;
}

interface ProjectReportData {
  onCph: number;
  onVar: number;
  offCph: number;
  zcms: number;
}

const useProjectReportLogic = () => {

  const [searchParams] = useSearchParams();
  const [liveToggle, setLiveToggle] = useState<boolean>(false);
  const [data, setData] = useState<ProjectReportData[]>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [projectCount, setProjectCount] = useState<number>(0);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string | undefined>(searchParams.get('projectId') || undefined);
  const [isListView, setIsListView] = useState<boolean>(true);
  const [chartData, setChartData] = useState<ChartData[]>([
    { field: 'ON-CPH', value: '0' },
    { field: 'ON-VAR', value: '0' },
    { field: 'OFF-CPH', value: '0' },
    { field: 'ZERO-CMS', value: '0' },
  ]);
  const [totalData, setTotalData] = useState<TotalData[]>([
    {
      Total: '0',
      'ON-CPH': '0',
      'ON-VAR': '0',
      'OFF-CPH': '0',
      'ZERO-CMS': '0',
    },
  ]);

  const projectReport = QueryHelper(useGetReportQuery, {
    projectId,
    live: liveToggle,
    ts: timestamp.toString(),
  });

  const resetVariables = () => {
    setData([]);
    setChartData([
      { field: 'ON-CPH', value: '0' },
      { field: 'ON-VAR', value: '0' },
      { field: 'OFF-CPH', value: '0' },
      { field: 'ZERO-CMS', value: '0' },
    ]);
    setTotalData([
      {
        Total: '0',
        'ON-CPH': '0',
        'ON-VAR': '0',
        'OFF-CPH': '0',
        'ZERO-CMS': '0',
      },
    ]);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchParams = {
      projectId: projectId,
      live: liveToggle,
      ts: timestamp,
    };

    if (liveToggle) {
      fetchData(projectReport.refetch, fetchParams);
      intervalId = setInterval(() => {
        setTimestamp(Date.now());
      }, 15000);
    } else fetchData(projectReport.refetch, fetchParams);

    return () => {
      clearInterval(intervalId);
    };
  }, [liveToggle]);

  useEffect(() => {
    if (!projectReport.data) return;

    setData(projectReport.data);
  }, [projectCount, isRefetching, projectReport.data]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    if (liveToggle) refetchCheck();

    const totals = data.reduce(
      (acc, project) => {
        acc.onCph += parseFloat(project.onCph.toString()) || 0;
        acc.onVar += parseFloat(project.onVar.toString()) || 0;
        acc.offCph += parseFloat(project.offCph.toString()) || 0;
        acc.zcms += parseFloat(project.zcms.toString()) || 0;
        return acc;
      },
      { onCph: 0, onVar: 0, offCph: 0, zcms: 0 }
    );

    const newChartData = [
      { field: 'ON-CPH', value: totals.onCph.toFixed(2) },
      { field: 'ON-VAR', value: totals.onVar.toFixed(2) },
      { field: 'OFF-CPH', value: totals.offCph.toFixed(2) },
      { field: 'ZERO-CMS', value: totals.zcms.toFixed(2) },
    ];

    setChartData(newChartData);

    const newTotalData = [
      {
        Total: (
          totals.onCph +
          totals.onVar +
          totals.offCph +
          totals.zcms
        ).toFixed(2),
        'ON-CPH': totals.onCph.toFixed(2),
        'ON-VAR': totals.onVar.toFixed(2),
        'OFF-CPH': totals.offCph.toFixed(2),
        'ZERO-CMS': totals.zcms.toFixed(2),
      },
    ];

    setTotalData(newTotalData);
  }, [data]);


  const refetchCheck = () => {
    if (projectCount > projectReport.data.length && !isRefetching) {
      setTimeout(() => {
        setIsRefetching(true);
        fetchData(projectReport.refetch, {
          projectId: projectId,
          live: liveToggle,
          ts: timestamp,
        }).finally(() => {
          setIsRefetching(false);
        });
      }, 1000);
    }
    setProjectCount(projectReport.data.length);
  };

  const handleLiveToggle = () => {
    // true is list view and false is grid view
    setLiveToggle((prev) => !prev);
  };

  const fetchData = async (refetch: Function, props: any) => {
    try {
      const result = await refetch(props);
      if (result?.error?.status === 499) return;
      if (result?.data) {
        setData(result.data);
      } else {
        resetVariables();
      }
    } catch (err) {
    }
  };

  const handleViewChange = () => {
    setIsListView(prev => !prev);
  }

  return {
    liveToggle,
    handleLiveToggle,
    data,
    chartData,
    totalData,
    projectReportIsLoading: projectReport.isLoading,
    projectReportIsSuccess: projectReport.isSuccess,
    projectReportData: projectReport.data,
    isListView,
    handleViewChange
  };
};

export default useProjectReportLogic;
