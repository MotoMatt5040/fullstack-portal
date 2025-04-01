import { apiSlice } from "../../app/api/apiSlice";

export const productionReportApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      getProductionReport: builder.query({
        query: ({ projectIds, startDate, endDate }) => {
          return {
            url: `/productionreport/tables/data?projectIds=${projectIds}&startdate=${startDate}&enddate=${endDate}`,
            method: 'GET',
          };
        },
      }),
      getProjectsInDateRange: builder.query({
        query: ({ startDate, endDate }) => {
          return {
            url: `/productionreport/tables/projects?startdate=${startDate}&enddate=${endDate}`,
            method: 'GET',
          };
        },
      }),
    }),
  });

export const { useGetProductionReportQuery, useLazyGetProductionReportQuery, useGetProjectsInDateRangeQuery, useLazyGetProjectsInDateRangeQuery } = productionReportApiSlice;
