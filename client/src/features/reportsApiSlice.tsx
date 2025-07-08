import { apiSlice } from '../app/api/apiSlice';
import { removeTimeZone } from '../utils/DateFormat';

interface ReportArgs {
  live: boolean;
  useGpcph: boolean;

  projectId?: string; 
  startDate?: string;  
  endDate?: string;  
  ts?: string;
  recDate?: string;
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
      query: ({ projectId, live, startDate, endDate, ts, useGpcph }) => {
        
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

        url += `useGpcph=${useGpcph}`;

        // Remove the trailing '&' if there is one
        if (url.endsWith('&')) {
          url = url.slice(0, -1);
        }

        return { url, method: 'GET' };
      },
    }),

    getProductionReport: builder.query<ReportResponse, ReportArgs>({
      query: ({ projectId, recDate, useGpcph }) => {
        const url = `/reports/data/productionreport?projectId=${projectId}&recDate=${removeTimeZone(recDate ?? '')}&useGpcph=${useGpcph}`; //removeTimeZone is required
        return { url, method: 'GET' };
      }
    }),

    updateTargetMphAndCph: builder.mutation<void, { projectId: number; recDate: string | Date; targetMph: number, prevTargetMph: number, gpcph: number }>({
      query: ({ projectId, recDate, targetMph, prevTargetMph, gpcph }) => ({
        url: '/reports/data/update/targetmphandcph',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: { projectId, recDate: removeTimeZone(recDate), targetMph, prevTargetMph, gpcph },//removeTimeZone is required
      }),
    }),
    getToplineReport: builder.query<Blob, void>({
      query: () => ({
        url: '/reports/topline-report',
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const { useGetReportQuery, useGetProductionReportQuery, useUpdateTargetMphAndCphMutation, useGetToplineReportQuery, useLazyGetToplineReportQuery } = ReportApiSlice;
