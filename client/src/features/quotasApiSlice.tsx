import { apiSlice } from '../app/api/apiSlice';

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

interface QuotaProject {
  projectid: string;
  projectname: string;
  fieldstart: string;
}

interface QuotaProjectsArgs {
  userId?: string;
}

export const QuotasApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuotas: builder.query<QuotasResponse, QuotaArgs>({
      query: ({ projectId, isInternalUser }) => {
        const url = `/quota-management/data?projectId=${projectId}&isInternalUser=${isInternalUser}`;
        return { url, method: 'GET' };
      },
    }),
    getQuotaProjects: builder.query<QuotaProject[], QuotaProjectsArgs>({
      query: ({ userId }) => {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        const queryString = params.toString();
        return {
          url: `/quota-management/projects${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
    }),
  }),
});

export const {
  useLazyGetQuotasQuery,
  useGetQuotaProjectsQuery,
  useLazyGetQuotaProjectsQuery,
} = QuotasApiSlice;


