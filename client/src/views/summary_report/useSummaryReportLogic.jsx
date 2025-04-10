import { useState, useEffect } from 'react';
import { useGetSummaryReportQuery } from '../../features/summaryReportApiSlice';
import { today } from '@internationalized/date';

const useProjectReportLogic = () => {
	const queryHelper = (queryHook, params) => {
		const { data, refetch } = queryHook(params);
		return { data, refetch };
	};

	const [liveToggle, setLiveToggle] = useState(true);
	const [data, setData] = useState([]);
	const [isSuccess, setIsSuccess] = useState(false);
	const [timestamp, setTimestamp] = useState(Date.now());
	const [projectCount, setProjectCount] = useState(0);
	const [isRefetching, setIsRefetching] = useState(false);
	const [landLineThresholds, setLandLineThresholds] = useState({ MPH: 22, CPH: 1 });
	const [cellThresholds, setCellThresholds] = useState({ MPH: 18, CPH: 1 });
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
		start: today('America/Chicago').subtract({ days: 1 }),
		end: today('America/Chicago').subtract({ days: 1 }),
	})
	const summaryReport = queryHelper(useGetSummaryReportQuery, {
		live: liveToggle,
		startDate: date.start,
		endDate: date.end,
		ts: timestamp,
	});

	const resetVariables = () => {
		setData([]);
		setIsSuccess(false);
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
    } else {
        fetchData(summaryReport.refetch, fetchParams);
    }

    return () => {
        clearInterval(intervalId);
    };
}, [liveToggle, date]);

	useEffect(() => {
		if (!summaryReport.data) {
			return;
		}

		setData(summaryReport.data);
	}, [projectCount, isRefetching, summaryReport.data]);

	useEffect(() => {
		if (!data || data.length === 0) return;

		if (liveToggle) {
			refetchCheck();
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
	}

	const handleLiveToggle = () => {
		setLiveToggle((prev) => !prev);
	};

	const fetchData = async (refetch, props) => {
		try {
			const result = await refetch(props);
			if (result?.error?.status === 204) {
				setIsSuccess(false);
				resetVariables();
			}
			if (result?.data) {
				setIsSuccess(true);
				setData(result.data);
			} else {
				setIsSuccess(false);
			}
		} catch (err) {
			console.error(err);
			setIsSuccess(false);
		}
	};

	const handleDateChange = (newDate) => {
		const start = newDate.start
		const end = newDate.end
		setDate({ start, end });
	}

	return {
		liveToggle,
		handleLiveToggle,
		data,
		isSuccess,
		chartData,
		totalData,
		date,
		handleDateChange,
	};
};

export default useProjectReportLogic;
