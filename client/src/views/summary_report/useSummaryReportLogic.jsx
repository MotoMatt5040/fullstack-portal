import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGetReportQuery } from '../../features/reportsApiSlice';
import { parseDate, today } from '@internationalized/date';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSummaryStartDate,
  setSummaryEndDate,
  setSummaryIsLive,
} from '../../features/summarySlice';
import useReportSSE from '../../hooks/useReportSSE';

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
  const [isListView, setIsListView] = useState(true);

  // Ref to track if we have received initial data (prevents flickering on refreshes)
  const hasInitialDataRef = useRef(false);
  // Track last known good data count
  const lastCountRef = useRef(0);
  // Stable timestamp for RTK Query cache-busting (only changes on explicit refetch)
  const [timestamp, setTimestamp] = useState(Date.now());
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

  // RTK Query for historic mode only — skip entirely in live mode (SSE handles live data)
  const { data: queryData, isLoading, isFetching } = useGetReportQuery(
    {
      live: false,
      startDate: date.start,
      endDate: date.end,
      ts: timestamp,
      useGpcph,
    },
    { skip: liveToggle }
  );

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
  }, [dispatch]);

  // Process incoming SSE data for live mode
  const processIncomingData = useCallback((rawData) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return;

    let processedData = rawData;

    if (window.innerWidth < 768) {
      processedData = processedData.map((item) => ({
        ...item,
        projName:
          item.projName.length > 7
            ? item.projName.slice(0, 7) + '…'
            : item.projName,
      }));
    }

    hasInitialDataRef.current = true;
    lastCountRef.current = processedData.length;
    setData(processedData);
  }, []);

  // SSE connection for live mode
  const { isConnected: sseConnected } = useReportSSE({
    useGpcph,
    enabled: liveToggle,
    onData: processIncomingData,
  });

  // Historic mode: refetch when date changes
  useEffect(() => {
    if (liveToggle) return;
    // Bump timestamp to trigger a new RTK Query fetch
    setTimestamp(Date.now());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveToggle, date]);

  // Process incoming data for historic mode (RTK Query)
  // Live mode data is handled by SSE via processIncomingData callback
  useEffect(() => {
    if (liveToggle) return;
    if (!queryData || !Array.isArray(queryData)) return;

    let processedData = queryData;

    if (window.innerWidth < 768) {
      processedData = processedData.map((item) => ({
        ...item,
        projName:
          item.projName.length > 7
            ? item.projName.slice(0, 7) + '…'
            : item.projName,
      }));
    }

    if (processedData.length > 0) {
      hasInitialDataRef.current = true;
      lastCountRef.current = processedData.length;
    }

    setData(processedData);
  }, [queryData, liveToggle]);

  // Memoize totals calculation to avoid re-computing on every render
  const { chartData, totalData } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        chartData: [
          { field: 'ON-CPH', value: '0.00' },
          { field: 'ON-VAR', value: '0.00' },
          { field: 'OFF-CPH', value: '0.00' },
          { field: 'ZERO-CMS', value: '0.00' },
        ],
        totalData: [
          {
            Total: '0.00',
            'ON-CPH': '0.00',
            'ON-VAR': '0.00',
            'OFF-CPH': '0.00',
            'ZERO-CMS': '0.00',
          },
        ],
      };
    }

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

    return {
      chartData: [
        { field: 'ON-CPH', value: totals.onCph.toFixed(2) },
        { field: 'ON-VAR', value: totals.onVar.toFixed(2) },
        { field: 'OFF-CPH', value: totals.offCph.toFixed(2) },
        { field: 'ZERO-CMS', value: totals.zcms.toFixed(2) },
      ],
      totalData: [
        {
          Total: (totals.onCph + totals.onVar + totals.offCph + totals.zcms).toFixed(2),
          'ON-CPH': totals.onCph.toFixed(2),
          'ON-VAR': totals.onVar.toFixed(2),
          'OFF-CPH': totals.offCph.toFixed(2),
          'ZERO-CMS': totals.zcms.toFixed(2),
        },
      ],
    };
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

  // Initial loading = no data yet
  // Live mode: waiting for first SSE push. Historic mode: waiting for RTK Query.
  const isInitialLoading = !hasInitialDataRef.current &&
    (liveToggle ? !sseConnected : (isLoading || isFetching));

  return {
    liveToggle,
    handleLiveToggle,
    data,
    isInitialLoading,
    isRefreshing: hasInitialDataRef.current && (liveToggle ? false : isFetching),
    chartData,
    totalData,
    date,
    handleDateChange,
    isListView,
    handleViewChange,
  };
};

export default useProjectReportLogic;
