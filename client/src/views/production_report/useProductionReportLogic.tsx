import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useGetProductionReportQuery,
  useUpdateTargetMphAndCphMutation,
} from '../summary_report/reportsApiSlice';
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
  // Calculated values
  todaysCmsGoal?: number;
  todaysCmsDiff?: number;
  expectedCphInverse?: string;
  actualCphPercentage?: number;
  amphPercentage?: number;
  targetMph80Cutoff?: number;
  expectedCph80Cutoff?: number;
  expectedCph60Cutoff?: number;
  top20Count?: number;
  todaysCmsDiffIsPositive?: boolean;
  actualCphMeetsExpected?: boolean;
  amphMeetsTarget?: boolean;
};

const useProductionReportLogic = (): ProductionReportLogic => {
  const [searchParams] = useSearchParams();
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const useGpcph = useSelector((state: any) => state.settings.useGpcph);
  const [updateTargetMphAndCph] = useUpdateTargetMphAndCphMutation();

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
  }, []);

  useEffect(() => {
    if (!productionReport.data) return;
    setData(productionReport.data);
    const loi = productionReport.data[0].mean;
    const tmph = productionReport.data[0].targetMph;
    setProjectName(productionReport.data[0].projName);
    setTotalHours(productionReport.data[0].totalHours);
    setTotalCms(productionReport.data[0].totalCms);
    setTargetMph(tmph);
    setPrevTargetMph(tmph ?? 0);
    setIncidence(productionReport.data[0].inc);
    setExpectedLoi(loi.toFixed(2));
    setActualCph(productionReport.data[0].actualCph);
    setMphIsUpdated(true);
    setRecDate(searchParams.get('recDate') ?? '');
    setDailyLoi(Number(searchParams.get('al') ?? 0));
    setAmph(Number(searchParams.get('mph') ?? 0));
  }, [productionReport.data]);

  useEffect(() => {
    // Add safety checks before calculating
    if (targetMph > 0 && expectedLoi > 0) {
      setExpectedCph(targetMph / expectedLoi);
    } else {
      setExpectedCph(0); // Set to 0 instead of NaN
    }
    if (targetMph == prevTargetMph) setMphIsUpdated(true);
  }, [targetMph, expectedLoi]); // Add expectedLoi as dependency

  // Calculated values with safety checks
  const todaysCmsGoal = totalHours * expectedCph;
  const todaysCmsDiff = (totalCms - todaysCmsGoal).toFixed(2);
  const expectedCphInverse =
    expectedCph > 0 && isFinite(expectedCph)
      ? (1 / expectedCph).toFixed(2)
      : 'div/0';
  const actualCphPercentage =
    expectedCph > 0 ? (actualCph / expectedCph) * 100 : 0;
  const amphPercentage = targetMph > 0 ? (amph / targetMph) * 100 : 0;
  const targetMph80Cutoff = targetMph * 0.8;
  const expectedCph80Cutoff = expectedCph * 0.8;
  const expectedCph60Cutoff = expectedCph * 0.6;
  const top20Count = data.length * 0.2;

  // Boolean conditions for styling
  const todaysCmsDiffIsPositive = todaysCmsDiff >= 0;
  const actualCphMeetsExpected = actualCph >= expectedCph;
  const amphMeetsTarget = amph >= targetMph;

  const resetVariables = () => {
    setProjectId('');
    setRecDate('');
    setTimestamp(Date.now());
    setData([]);
  };

  const handleMphChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetMph(Number(e.target.value));
    setMphIsUpdated(false);
  };

  const handleConfirm = async (e) => {
    if (targetMph === prevTargetMph) return;
    if (e.key !== 'Enter') return;
    if (window.confirm(`Update Target MPH to ${targetMph} and GPCPH to ${expectedCph.toFixed(2)}?`)) {
      try {
        await updateTargetMphAndCph({
          projectId,
          recDate,
          targetMph,
          prevTargetMph,
          gpcph: expectedCph.toFixed(2),
        }).unwrap();
        setMphIsUpdated(true);
        setPrevTargetMph(targetMph);
        // alert('Updated successfully!');
        window.location.reload();
      } catch (err) {
        console.error('Update failed:', err);
        alert(err?.data?.error || 'Update failed!');
      }
    }
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
    handleMphChange,
    // Calculated values
    todaysCmsGoal,
    todaysCmsDiff,
    expectedCphInverse,
    actualCphPercentage,
    amphPercentage,
    targetMph80Cutoff,
    expectedCph80Cutoff,
    expectedCph60Cutoff,
    top20Count,
    todaysCmsDiffIsPositive,
    actualCphMeetsExpected,
    amphMeetsTarget,
  };
};

export default useProductionReportLogic;
