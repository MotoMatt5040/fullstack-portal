import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGetReportQuery } from '../../features/reportsApiSlice';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useReportSSE from '../../hooks/useReportSSE';

interface ProjectReportData {
  onCph: number;
  onVar: number;
  offCph: number;
  zcms: number;
}

const useProjectReportLogic = () => {
  const useGpcph = useSelector((state: any) => state.settings.useGpcph);

  const [searchParams] = useSearchParams();
  const [liveToggle, setLiveToggle] = useState<boolean>(false);
  const [data, setData] = useState<ProjectReportData[]>([]);
  const [projectId] = useState<string | undefined>(
    searchParams.get('projectId') || undefined
  );
  const [isListView, setIsListView] = useState<boolean>(true);
  // Stable timestamp for RTK Query cache-busting (only changes on explicit refetch)
  const [timestamp, setTimestamp] = useState(Date.now());

  // RTK Query for historic/non-live mode only — skip in live mode (SSE handles it)
  const { data: queryData, isLoading, isSuccess } = useGetReportQuery(
    {
      projectId,
      live: false,
      ts: timestamp.toString(),
      useGpcph,
    },
    { skip: liveToggle }
  );

  // Process incoming SSE data for live mode
  const handleSSEData = useCallback((rawData: ProjectReportData[]) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return;
    setData(rawData);
  }, []);

  // SSE connection for live mode
  useReportSSE({
    projectId,
    useGpcph,
    enabled: liveToggle,
    onData: handleSSEData,
  });

  // Historic mode: refetch when toggle changes
  useEffect(() => {
    if (liveToggle) return;
    setTimestamp(Date.now());
  }, [liveToggle]);

  // Process RTK Query data for historic mode
  useEffect(() => {
    if (liveToggle) return;
    if (!queryData) return;
    setData(queryData);
  }, [queryData, liveToggle]);

  // Compute chart and total data from data
  const { chartData, totalData } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        chartData: [
          { field: 'ON-CPH', value: '0' },
          { field: 'ON-VAR', value: '0' },
          { field: 'OFF-CPH', value: '0' },
          { field: 'ZERO-CMS', value: '0' },
        ],
        totalData: [
          {
            Total: '0',
            'ON-CPH': '0',
            'ON-VAR': '0',
            'OFF-CPH': '0',
            'ZERO-CMS': '0',
          },
        ],
      };
    }

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

    return {
      chartData: [
        { field: 'ON-CPH', value: totals.onCph.toFixed(2) },
        { field: 'ON-VAR', value: totals.onVar.toFixed(2) },
        { field: 'OFF-CPH', value: totals.offCph.toFixed(2) },
        { field: 'ZERO-CMS', value: totals.zcms.toFixed(2) },
      ],
      totalData: [
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
      ],
    };
  }, [data]);

  const handleLiveToggle = () => {
    setLiveToggle((prev) => !prev);
  };

  const handleViewChange = () => {
    setIsListView((prev) => !prev);
  };

  return {
    liveToggle,
    handleLiveToggle,
    data,
    chartData,
    totalData,
    projectReportIsLoading: isLoading,
    projectReportIsSuccess: isSuccess,
    projectReportData: queryData,
    isListView,
    handleViewChange,
  };
};

export default useProjectReportLogic;
