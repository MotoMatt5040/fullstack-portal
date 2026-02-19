import { useGetReportQuery } from '../views/summary_report/reportsApiSlice';

type ReportQueryArgs = {
  projectId: string | undefined;
  live: boolean;
  ts: string;
  useGpcph: boolean;
  recDate?: string
};

export const QueryHelper = (
  queryHook: (args: ReportQueryArgs) => ReturnType<typeof useGetReportQuery>,
  params: ReportQueryArgs
) => {
  const { data, refetch, isLoading, isFetching, isSuccess, isError } = queryHook(params);
  return { data, refetch, isLoading, isFetching, isSuccess, isError };
};

export default QueryHelper;