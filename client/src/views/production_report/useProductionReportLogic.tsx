import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetProductionReportQuery } from '../../features/reportsApiSlice';
import QueryHelper from '../../utils/QueryHelper';
import { useSelector } from 'react-redux';

type ProductionReportLogic = {
	projectId: string;
	recDate: string;
	productionReportIsLoading?;
	productionReportIsSuccess?;
	productionReportIsFetching?;
	data?: any[];
};

const useProductionReportLogic = (): ProductionReportLogic => {
	const [searchParams] = useSearchParams();
	const [timestamp, setTimestamp] = useState<number>(Date.now());
	const useGpcph = useSelector((state: any) => state.settings.useGpcph);

	const initProjectId: string = searchParams.get('projectId') || '';
	const initRecDate: string = searchParams.get('recDate') || '';

	const [projectId, setProjectId] = useState(initProjectId ?? '');
	const [recDate, setRecDate] = useState(initRecDate ?? '');
	const [data, setData] = useState([]);

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
	}, [])

  useEffect(() => {
    if (!productionReport.data) return;
    setData(productionReport.data);
  }, [productionReport.data])


	const resetVariables = () => {
		setProjectId('');
		setRecDate('');
		setTimestamp(Date.now());
		setData([]);
	};

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
        
        console.log(result.data)
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
		data,
	};
};

export default useProductionReportLogic;
