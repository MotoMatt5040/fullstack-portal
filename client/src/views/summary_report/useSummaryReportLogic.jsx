import { useState, useEffect, useRef } from 'react';
// import { useGetSummaryReportQuery } from '../../features/summaryReportApiSlice';
import { useGetReportQuery } from '../../features/reportsApiSlice';
import { parseDate, today } from '@internationalized/date';
import { useSearchParams } from 'react-router-dom';
import QueryHelper from '../../utils/QueryHelper';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSummaryStartDate,
  setSummaryEndDate,
  setSummaryIsLive,
} from '../../features/summarySlice';

const getDateFromParams = (key, fallback) => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  return value ? parseDate(value) : fallback;
};

const useProjectReportLogic = () => {
  const dispatch = useDispatch();
  const useGpcph = useSelector((state) => state.settings.useGpcph);

  const [searchParams] = useSearchParams();

  const [liveToggle, setLiveToggle] = useState(
    searchParams.get('live') === 'false' ? false : true
  );
  const [data, setData] = useState([]);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [isListView, setIsListView] = useState(true);

  // Ref to track if we have received initial data (prevents flickering on refreshes)
  const hasInitialDataRef = useRef(false);
  // Track last known good data count to detect potential incomplete responses
  const lastCountRef = useRef(0);
  // Track if we're doing a validation re-fetch
  const isValidatingRef = useRef(false);
  // Store pending validation data to compare against
  const pendingValidationRef = useRef(null);
  const [chartData, setChartData] = useState([
    { field: 'ON-CPH', value: 0 },
    { field: 'ON-VAR', value: 0 },
    { field: 'OFF-CPH', value: 0 },
    { field: 'ZERO-CMS', value: 0 },
  ]);
  const [totalData, setTotalData] = useState([
    {
      Total: 0,
      'ON-CPH': 0,
      'ON-VAR': 0,
      'OFF-CPH': 0,
      'ZERO-CMS': 0,
    },
  ]);
  const [date, setDate] = useState({
    start: getDateFromParams(
      'startDate',
      today('America/Chicago').subtract({ days: 1 })
    ),
    end: getDateFromParams(
      'endDate',
      today('America/Chicago').subtract({ days: 1 })
    ),
  });
  const summaryReport = QueryHelper(useGetReportQuery, {
    live: liveToggle,
    startDate: date.start,
    endDate: date.end,
    ts: timestamp,
    useGpcph: useGpcph,
  });

  const resetVariables = () => {
    setData([]);
    // setIsSuccess(false);
    setChartData([
      { field: 'ON-CPH', value: 0 },
      { field: 'ON-VAR', value: 0 },
      { field: 'OFF-CPH', value: 0 },
      { field: 'ZERO-CMS', value: 0 },
    ]);
    setTotalData([
      {
        Total: 0,
        'ON-CPH': 0,
        'ON-VAR': 0,
        'OFF-CPH': 0,
        'ZERO-CMS': 0,
      },
    ]);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const live = params.get('live');
    const start = params.get('startDate');
    const end = params.get('endDate');
    dispatch(setSummaryIsLive(live === 'true'));
    dispatch(setSummaryStartDate(start));
    dispatch(setSummaryEndDate(end));

    if (live !== null) setLiveToggle(live === 'true');

    if (start && end) {
      try {
        setDate({
          start: parseDate(start),
          end: parseDate(end),
        });
      } catch {
        // fallback to yesterday
        const fallback = today('America/Chicago').subtract({ days: 1 });
        setDate({ start: fallback, end: fallback });
      }
    }
  }, []);

  useEffect(() => {
    let intervalId;

    const fetchParams = {
      live: liveToggle,
      startDate: date.start,
      endDate: date.end,
      ts: timestamp,
    };

    if (liveToggle) {
      fetchData(summaryReport.refetch, fetchParams);
      intervalId = setInterval(() => {
        setTimestamp(Date.now());
      }, 15000);
    } else fetchData(summaryReport.refetch, fetchParams);

    return () => {
      clearInterval(intervalId);
    };
  }, [liveToggle, date]);

  // Process incoming data - backend handles stale request filtering via 204 responses
  useEffect(() => {
    // Ignore empty/null data - keep showing existing data
    if (!summaryReport.data || !Array.isArray(summaryReport.data)) return;

    // In live mode with existing data, ignore empty arrays (stale 204 response was converted to empty)
    if (liveToggle && summaryReport.data.length === 0 && hasInitialDataRef.current) {
      return;
    }

    const newCount = summaryReport.data.length;
    const lastCount = lastCountRef.current;

    // If we're in a validation cycle, compare results
    if (isValidatingRef.current && pendingValidationRef.current !== null) {
      isValidatingRef.current = false;
      const pendingCount = pendingValidationRef.current.length;

      // Use whichever response has more data (assume incomplete is the issue)
      if (newCount >= pendingCount) {
        // Validation returned same or more - use validation data
        lastCountRef.current = newCount;
        pendingValidationRef.current = null;
        // Process and set the validated data
        let processedData = summaryReport.data;
        if (window.innerWidth < 768) {
          processedData = processedData.map((item) => ({
            ...item,
            projName:
              item.projName.length > 7
                ? item.projName.slice(0, 7) + '…'
                : item.projName,
          }));
        }
        setData(processedData);
      } else {
        // Original had more data - keep the pending data, update count
        lastCountRef.current = pendingCount;
        let processedData = pendingValidationRef.current;
        if (window.innerWidth < 768) {
          processedData = processedData.map((item) => ({
            ...item,
            projName:
              item.projName.length > 7
                ? item.projName.slice(0, 7) + '…'
                : item.projName,
          }));
        }
        pendingValidationRef.current = null;
        setData(processedData);
      }
      return;
    }

    // In live mode: detect when count drops from previous
    // Trigger a silent validation re-fetch to confirm
    if (liveToggle && lastCount > 0 && newCount > 0 && newCount < lastCount) {
      // Store the new (potentially incomplete) data for comparison
      pendingValidationRef.current = summaryReport.data;
      isValidatingRef.current = true;
      // Trigger a re-fetch by updating timestamp - data will be compared on next response
      setTimestamp(Date.now());
      // Don't update displayed data yet - wait for validation
      return;
    }

    let processedData = summaryReport.data;

    // Trim project names on mobile
    if (window.innerWidth < 768) {
      processedData = processedData.map((item) => ({
        ...item,
        projName:
          item.projName.length > 7
            ? item.projName.slice(0, 7) + '…'
            : item.projName,
      }));
    }

    // Update last known count
    if (processedData.length > 0) {
      hasInitialDataRef.current = true;
      lastCountRef.current = processedData.length;
    }

    setData(processedData);
  }, [summaryReport.data, liveToggle]);

  // Calculate totals when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;

    const totals = data.reduce(
      (acc, project) => {
        acc.onCph += parseFloat(project.onCph) || 0;
        acc.onVar += parseFloat(project.onVar) || 0;
        acc.offCph += parseFloat(project.offCph) || 0;
        acc.zcms += parseFloat(project.zcms) || 0;
        return acc;
      },
      { onCph: 0, onVar: 0, offCph: 0, zcms: 0 }
    );

    setChartData([
      { field: 'ON-CPH', value: totals.onCph.toFixed(2) },
      { field: 'ON-VAR', value: totals.onVar.toFixed(2) },
      { field: 'OFF-CPH', value: totals.offCph.toFixed(2) },
      { field: 'ZERO-CMS', value: totals.zcms.toFixed(2) },
    ]);

    setTotalData([
      {
        Total: (totals.onCph + totals.onVar + totals.offCph + totals.zcms).toFixed(2),
        'ON-CPH': totals.onCph.toFixed(2),
        'ON-VAR': totals.onVar.toFixed(2),
        'OFF-CPH': totals.offCph.toFixed(2),
        'ZERO-CMS': totals.zcms.toFixed(2),
      },
    ]);
  }, [data]);

  const handleLiveToggle = () => {
    const newToggle = !liveToggle;
    dispatch(setSummaryIsLive(newToggle));
    setLiveToggle(newToggle);

    if (newToggle) {
      const newUrl = window.location.pathname;
      window.history.pushState({}, '', newUrl);
      dispatch(setSummaryStartDate(null));
      dispatch(setSummaryEndDate(null));
      dispatch(setSummaryIsLive(true));
    } else {
      const params = new URLSearchParams(window.location.search);
      params.set('live', newToggle);
      params.set('startDate', date.start.toString());
      params.set('endDate', date.end.toString());
      dispatch(setSummaryStartDate(date.start.toString()));
      dispatch(setSummaryEndDate(date.end.toString()));
      dispatch(setSummaryIsLive(false));

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const fetchData = async (refetch, props) => {
    props.useGpcph = useGpcph;
    try {
      const result = await refetch(props);

      // Ignore stale/cancelled requests (204 from backend, 499 legacy)
      if (result?.error?.status === 499 || result?.error?.status === 204) {
        return;
      }

      // Data processing is handled by the useEffect watching summaryReport.data
      // Only reset in historic mode when genuinely no data
      if (!liveToggle && result?.data?.length === 0) {
        resetVariables();
      }
    } catch (err) {
      // Silently ignore fetch errors
    }
  };

  const handleDateChange = (newDate) => {
    const start = newDate.start;
    const end = newDate.end;
    dispatch(setSummaryStartDate(start.toString()));
    dispatch(setSummaryEndDate(end.toString()));
    setDate({ start, end });

    const params = new URLSearchParams(window.location.search);
    params.set('startDate', start);
    params.set('endDate', end);
    params.set('live', liveToggle);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleViewChange = () => {
    setIsListView((prev) => !prev);
  };

  // Initial loading = no data yet and fetching
  // Once we have data, never show loading again (seamless updates)
  const isInitialLoading = !hasInitialDataRef.current && (summaryReport.isLoading || summaryReport.isFetching);

  return {
    liveToggle,
    handleLiveToggle,
    data,
    // For live mode: only show loading on initial load, not on refreshes
    isInitialLoading,
    // Background refresh indicator (optional subtle indicator)
    isRefreshing: hasInitialDataRef.current && summaryReport.isFetching,
    chartData,
    totalData,
    date,
    handleDateChange,
    isListView,
    handleViewChange,
  };
};

export default useProjectReportLogic;
