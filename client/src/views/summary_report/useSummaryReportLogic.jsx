import { useState, useEffect } from 'react';
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
  const [projectCount, setProjectCount] = useState(0);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isListView, setIsListView] = useState(true);
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
    console.log(live, start, end);
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

  useEffect(() => {
    if (!summaryReport.data) return;

    let data = summaryReport.data;

    if (window.innerWidth < 768) {
      const trimmedData = data.map((item) => ({
        ...item,
        projName:
          item.projName.length > 7
            ? item.projName.slice(0, 7) + '…'
            : item.projName,
      }));
      data = trimmedData;
    }

    setData(data);
  }, [projectCount, isRefetching, summaryReport.data]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    if (liveToggle) refetchCheck();

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
    if (projectCount > summaryReport.data.length && !isRefetching) {
      setTimeout(() => {
        setIsRefetching(true);
        fetchData(summaryReport.refetch, {
          live: liveToggle,
          startDate: date.start,
          endDate: date.end,
          ts: timestamp,
        }).finally(() => {
          setIsRefetching(false);
        });
      }, 1000);
    }
    setProjectCount(summaryReport.data.length);
  };

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
      // This is a custom error code for when the server cancels the request. This is not good practice and will be changed in the future.
      // To trigger this, begin a request then make another request immedietaly after. The server will cancel the first request.
      // Example: Start with live disabled..... Enable it, then disable it again. The server will cancel the first request.
      if (result?.error?.status === 499) return;
      if (result?.data) {
        setData(result.data);
      } else {
        resetVariables();
      }
    } catch (err) {}
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

  return {
    liveToggle,
    handleLiveToggle,
    data,
    summaryReportIsSuccess: summaryReport.isSuccess,
    summaryReportIsLoading: summaryReport.isLoading,
    summaryReportIsFetching: summaryReport.isFetching,
    chartData,
    totalData,
    date,
    handleDateChange,
    isListView,
    handleViewChange,
  };
};

export default useProjectReportLogic;
