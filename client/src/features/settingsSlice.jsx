import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  showGraphs: true,
  useGpcph: true
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleShowGraphs: (state) => {
      state.showGraphs = !state.showGraphs
    },
    toggleUseGpcph: (state) => {
      state.useGpcph = !state.useGpcph
    }
  },
})

export const { toggleShowGraphs, toggleUseGpcph } = settingsSlice.actions
export default settingsSlice.reducer
