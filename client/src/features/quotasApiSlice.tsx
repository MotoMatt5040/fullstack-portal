import { apiSlice } from '../app/api/apiSlice';
import { removeTimeZone } from '../utils/DateFormat';

interface QuotaArgs {
  projectId: string;
  isInternalUser: boolean;
}

interface QuotaData {
  totalPercent: string,
  totalObjective: string,
  totalFrequency: string,
  totalToGo: string,
  landlinePercent: string,
  landlineObjective: string,
  landlineFrequency: string,
  landlineToGo: string,
  cellPercent: string,
  cellObjective: string,
  cellFrequency: string,
  cellToGo: string,
  t2wPercent: string,
  t2wObjective: string,
  t2wFrequency: string,
  t2wToGo: string,
  panelPercent: string,
  panelObjective: string,
  panelFrequency: string,
  panelToGo: string,
}

interface Quotas {
  [label: string]: QuotaData;
}

type QuotasResponse = Quotas[];

export const ReportApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuotas: builder.query<QuotasResponse, QuotaArgs>({
      query: ({ projectId, isInternalUser }) => {
        const url = `/quota-management/data?projectId=${projectId}&isInternalUser=${isInternalUser}`;
        // if (url.endsWith('&')) {
        //   url = url.slice(0, -1);
        // }

        return { url, method: 'GET' };
      },
    }),
    getProjectList: builder.query({
      query: ({ userId }) => ({
        url: `/quota-management/projects?userId=${userId}`,
        method: 'GET',
      }),
    })
  }),
});

export const { useGetProjectListQuery, useLazyGetProjectListQuery, useLazyGetQuotasQuery } = ReportApiSlice;


