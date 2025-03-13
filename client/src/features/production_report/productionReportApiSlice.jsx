import { apiSlice } from "../../app/api/apiSlice";

export const productionReportApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
      getProductionReport: builder.query({
        query: ({ projectid, recdate }) => {
          return {
            url: `/productionreport/tables?projectid=${projectid}&recdate=${recdate}`,
            method: 'GET',
          };
        },
      }),
    }),
  });

export const { useGetProductionReportQuery, useLazyGetProductionReportQuery } = productionReportApiSlice;
