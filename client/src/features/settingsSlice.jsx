import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  showGraphs: true,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleShowGraphs: (state) => {
      state.showGraphs = !state.showGraphs
    },
    setShowGraphs: (state, action) => {
      state.showGraphs = action.payload
    },
  },
})

export const { toggleShowGraphs, setShowGraphs } = settingsSlice.actions
export default settingsSlice.reducer
