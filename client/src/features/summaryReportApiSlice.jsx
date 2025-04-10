import { apiSlice } from "../app/api/apiSlice";

export const summaryReportApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      getSummaryReport: builder.query({
        query: ({ live, startDate, endDate, ts }) => {
          const url = live 
            ? `/summaryReport/tables/data/live?ts=${ts}`
            : `/summaryReport/tables/data/historic?startdate=${startDate}&enddate=${endDate}`;
          return {
            url,
            method: 'GET',
          };
        },
      }),
    }),
  });

export const { useGetSummaryReportQuery } = summaryReportApiSlice;
