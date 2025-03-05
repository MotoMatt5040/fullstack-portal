import { createSlice } from "@reduxjs/toolkit"

const productionReportSlice = createSlice({
  name: 'productionReport',
  initialState: { projectid: null, recdate: null },
  reducers: {
    setProjectData: (state, action) => {
      const { projectid, recdate } = action.payload;
      state.projectid = projectid;
      state.recdate = recdate;
    },
    clearProjectData: (state) => {
      state.projectid = null;
      state.recdate = null;
    },
  },
});

export const { setProjectData, clearProjectData } = productionReportSlice.actions;
export default productionReportSlice.reducer;

export const selectProductionReportProjectID = (state) => state.productionReport.projectid;
export const selectProductionRecDate = (state) => state.productionReport.recdate;
