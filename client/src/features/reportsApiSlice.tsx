import { apiSlice } from '../app/api/apiSlice';

interface ReportArgs {
  live: boolean;

  projectId?: string; 
  startDate?: string;  
  endDate?: string;  
  ts?: string;
}

interface ProjectReport {
  recDate: string;
  projectId: number;
  projName: string;
  cms: number;
  hrs: number;
  cph: number;
  gpcph: number;
  mph: number;
  al: number;

  abbreviatedDate: string;
  totalHrs: string;
  offCph: string;
  onCph: string;
  onVar: string;
  zcms: string;
  mphThreshold: string;
  offCphThreshold: string;
  zcmsThreshold: string;
}

type ReportResponse = ProjectReport[];

export const ReportApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReport: builder.query<ReportResponse, ReportArgs>({
      query: ({ projectId, live, startDate, endDate, ts }) => {
        
        const basePath = '/reports/tables/data/';

        let url = '';

        if (live) {
          // If live is true, include the projectId and ts
          url = `${basePath}live?ts=${ts}`;
          if (projectId) url += `&projectId=${projectId}`;
        } else {
          // If live is false, include startDate and endDate
          url = `${basePath}historic?`;
          if (startDate) url += `startdate=${startDate}&`;
          if (endDate) url += `enddate=${endDate}&`;
          if (projectId) url += `projectId=${projectId}&`;
        }

        // Remove the trailing '&' if there is one
        if (url.endsWith('&')) {
          url = url.slice(0, -1);
        }

        return { url, method: 'GET' };
      },
    }),
  }),
});

export const { useGetReportQuery } = ReportApiSlice;
