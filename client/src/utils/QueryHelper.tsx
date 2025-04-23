import { useGetReportQuery } from '../features/reportsApiSlice';

type ReportQueryArgs = {
  projectId: string | undefined;
  live: boolean;
  ts: string;
};

export const QueryHelper = (
  queryHook: (args: ReportQueryArgs) => ReturnType<typeof useGetReportQuery>,
  params: ReportQueryArgs
) => {
  const { data, refetch, isLoading, isFetching, isSuccess, isError } = queryHook(params);
  return { data, refetch, isLoading, isFetching, isSuccess, isError };
};

export default QueryHelper;