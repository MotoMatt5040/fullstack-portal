import { useState, useEffect } from 'react';
import { useGetReportQuery } from '../../features/reportsApiSlice';
import { parseDate, today } from '@internationalized/date';
import { useSearchParams } from 'react-router-dom';

const getDateFromParams = (key, fallback) => {
	const params = new URLSearchParams(window.location.search);
	const value = params.get(key);
	return value ? parseDate(value) : fallback;
};

const useProjectReportLogic = () => {
	const queryHelper = (queryHook, params) => {
		const { data, refetch } = queryHook(params);
		return { data, refetch };
	};

	const [searchParams] = useSearchParams();
	const [liveToggle, setLiveToggle] = useState(false);
	const [data, setData] = useState([]);
	const [isSuccess, setIsSuccess] = useState(false);
	const [timestamp, setTimestamp] = useState(Date.now());
	const [projectCount, setProjectCount] = useState(0);
	const [isRefetching, setIsRefetching] = useState(false);
	const [projectId, setProjectId] = useState(searchParams.get('projectId') || undefined);
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
		// start: getDateFromParams('recDate', today('America/Chicago').subtract({ days: 1 })),
		// end: getDateFromParams('recDate', today('America/Chicago').subtract({ days: 1 })),
	});
	const projectReport = queryHelper(useGetReportQuery, {
		projectId,
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
			projectId: projectId,
			live: liveToggle,
			startDate: date.start,
			endDate: date.end,
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
	}, [liveToggle, date]);

	useEffect(() => {
		if (!projectReport.data) return;

		setData(projectReport.data);
	}, [projectCount, isRefetching, projectReport.data]);

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
		if (projectCount > projectReport.data.length && !isRefetching) {
			setTimeout(() => {
				setIsRefetching(true);
				fetchData(projectReport.refetch, {
					projectId: projectId,
					live: liveToggle,
					startDate: date.start,
					endDate: date.end,
					ts: timestamp,
				}).finally(() => {
					setIsRefetching(false);
				});
			}, 1000);
		}
		setProjectCount(projectReport.data.length);
	};

	const handleLiveToggle = () => {
		setLiveToggle((prev) => !prev);
	};

	const fetchData = async (refetch, props) => {
		try {
			const result = await refetch(props);
			// This is a custom error code for when the server cancels the request. This is not good practice and will be changed in the future.
			// To trigger this, begin a request then make another request immedietaly after. The server will cancel the first request.
			// Example: Start with live disabled..... Enable it, then disable it again. The server will cancel the first request.
			if (result?.error?.status === 499) return;
			if (result?.data) {
				setIsSuccess(true);
				setData(result.data);
			} else {
				setIsSuccess(false);
				resetVariables();
			}
		} catch (err) {
			// console.error(err);
			setIsSuccess(false);
		}
	};

	const handleDateChange = (newDate) => {
	const start = newDate.start;
	const end = newDate.end;

	setDate({ start, end });

	// const params = new URLSearchParams(window.location.search);
	// params.set('startDate', start.toString()); // toString() returns "YYYY-MM-DD"
	// params.set('endDate', end.toString());

// 	const newUrl = `${window.location.pathname}?${params.toString()}`;
// 	window.history.pushState({}, '', newUrl);
};

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
