import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetProductionReportQuery, useUpdateTargetMphMutation } from '../../features/reportsApiSlice';
import QueryHelper from '../../utils/QueryHelper';
import { useSelector } from 'react-redux';

type ProductionReportLogic = {
	projectId: string;
	recDate: string;
	productionReportIsLoading?;
	productionReportIsSuccess?;
	productionReportIsFetching?;
	data?: any[];
	projectName?: string;
	totalHours?: number;
	totalCms?: number;
	targetMph?: number;
	setTargetMph?: (value: number) => void;
	incidence?: number;
	expectedLoi?: number;
	expectedCph?: number;
	actualCph?: number;
	dailyLoi?: number;
	amph?: number;
	handleConfirm?: (e: React.KeyboardEvent) => void;
	mphIsUpdated?: boolean;
	handleMphChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const useProductionReportLogic = (): ProductionReportLogic => {
	const [searchParams] = useSearchParams();
	const [timestamp, setTimestamp] = useState<number>(Date.now());
	const useGpcph = useSelector((state: any) => state.settings.useGpcph);
	const [updateTargetMph] = useUpdateTargetMphMutation();

	const initProjectId: string = searchParams.get('projectId') || '';
	const initRecDate: string = searchParams.get('recDate') || '';

	const [projectId, setProjectId] = useState(initProjectId ?? '');
	const [recDate, setRecDate] = useState(initRecDate ?? '');
	const [data, setData] = useState([]);
	const [projectName, setProjectName] = useState('');
	const [totalHours, setTotalHours] = useState(0);
	const [totalCms, setTotalCms] = useState(0);
	const [targetMph, setTargetMph] = useState(0);
	const [prevTargetMph, setPrevTargetMph] = useState(0);
	const [mphIsUpdated, setMphIsUpdated] = useState(true);
	const [incidence, setIncidence] = useState(0);
	const [expectedLoi, setExpectedLoi] = useState(0);
	const [expectedCph, setExpectedCph] = useState(0);
	const [actualCph, setActualCph] = useState(0);
	const [dailyLoi, setDailyLoi] = useState(0);
	const [amph, setAmph] = useState(0);

	const productionReport = QueryHelper(useGetProductionReportQuery, {
		live: false,
		ts: timestamp.toString(),
		useGpcph: useGpcph,
		projectId: initProjectId,
		recDate: initRecDate,
	});

	useEffect(() => {
		setProjectId(searchParams.get('projectId') ?? '');
		setRecDate(searchParams.get('recDate') ?? '');
		setDailyLoi(Number(searchParams.get('al') ?? 0));
		setAmph(Number(searchParams.get('mph') ?? 0));
	}, [])

  useEffect(() => {
    if (!productionReport.data) return;
    setData(productionReport.data);
		const loi = productionReport.data[0].mean
		const tmph = productionReport.data[0].targetMph;
		setProjectName(productionReport.data[0].projName);
		setTotalHours(productionReport.data[0].totalHours);
		setTotalCms(productionReport.data[0].totalCms);
		setTargetMph(tmph)
		setPrevTargetMph(tmph ?? 0);
		setIncidence(productionReport.data[0].inc);
		setExpectedLoi(loi.toFixed(2));
		setActualCph(productionReport.data[0].actualCph);
		setMphIsUpdated(true);
		setRecDate(searchParams.get('recDate') ?? '');
		setDailyLoi(Number(searchParams.get('al') ?? 0));
		setAmph(Number(searchParams.get('mph') ?? 0));
  }, [productionReport.data])

	useEffect(() => {
		setExpectedCph((targetMph / expectedLoi));
		if (targetMph == prevTargetMph) setMphIsUpdated(true);
	}, [targetMph])


	const resetVariables = () => {
		setProjectId('');
		setRecDate('');
		setTimestamp(Date.now());
		setData([]);
	};

	const handleMphChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setTargetMph(Number(e.target.value));
		setMphIsUpdated(false);
	}

	const handleConfirm = async (e) => {
		if (targetMph === prevTargetMph) return;
		if (e.key !== 'Enter') return;
		if(window.confirm(`Update Target MPH from to ${targetMph}`)) {
			try {
				await updateTargetMph({ projectId, recDate, targetMph, prevTargetMph }).unwrap();
				setMphIsUpdated(true);
				setPrevTargetMph(targetMph);
				// alert('Updated successfully!');
				window.location.reload();
			} catch (err) {
				console.error('Update failed:', err);
				alert(err?.data?.error || 'Update failed!');
			}
		}
	}

	const fetchData = async () => {
		const fetchParams = {
			projectId: projectId,
			recDate: recDate,
			useGpcph: useGpcph,
		};
		try {
			const result = await productionReport.refetch(fetchParams);
			if (result?.error?.status === 499) return;
			if (result?.data) {
				setData(result.data);
			} else {
				resetVariables();
			}
		} catch (err) {}
	};

	return {
		projectId,
		recDate,
    productionReportIsFetching: productionReport.isFetching,
		productionReportIsLoading: productionReport.isLoading,
		productionReportIsSuccess: productionReport.isSuccess,
		projectName,
		totalHours,
		totalCms,
		targetMph,
		setTargetMph,
		data,
		incidence,
		expectedLoi,
		expectedCph,
		actualCph,
		dailyLoi,
		amph,
		handleConfirm,
		mphIsUpdated,
		handleMphChange
	};
};

export default useProductionReportLogic;
