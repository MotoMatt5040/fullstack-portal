import { createSlice } from "@reduxjs/toolkit"

const productionReportSlice = createSlice({
  name: 'productionReport',
  initialState: { projectIds: null, startDate: null, endDate: null },
  reducers: {
    setProjectData: (state, action) => {
      const { projectIds, startDate, endDate } = action.payload;
      state.projectIds = projectIds;
      state.startDate = startDate;
      state.endDate = endDate;
    },
    clearProjectData: (state) => {
      state.projectId = null;
      state.startDate = null;
      state.endDate = null;
    },
  },
});

export const { setProjectData, clearProjectData } = productionReportSlice.actions;
export default productionReportSlice.reducer;

export const selectProductionReportprojectId = (state) => state.productionReport.projectId;
export const selectProductionRecDate = (state) => state.productionReport.recdate;
