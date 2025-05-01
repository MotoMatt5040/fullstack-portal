import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  summaryIsLive: true,
  summaryStartDate: null,
  summaryEndDate: null
}

const summarySlice = createSlice({
  name: 'summary',
  initialState,
  reducers: {
    setSummaryIsLive: (state, action) => {
      state.summaryIsLive = action.payload
    },
    setSummaryStartDate: (state, action) => {
      state.summaryStartDate = action.payload
    },
    setSummaryEndDate: (state, action) => {
      state.summaryEndDate = action.payload
    },
  },
})

export const { setSummaryStartDate, setSummaryEndDate, setSummaryIsLive } = summarySlice.actions
export default summarySlice.reducer
