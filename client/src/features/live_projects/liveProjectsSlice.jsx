import { createSlice } from "@reduxjs/toolkit"

const liveProjectsSlice = createSlice({
  name: 'liveProjects',
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

export const { setProjectData, clearProjectData } = liveProjectsSlice.actions;
export default liveProjectsSlice.reducer;

export const selectLiveProject = (state) => state.liveProjects.projectid;
export const selectRecDate = (state) => state.liveProjects.recdate;
