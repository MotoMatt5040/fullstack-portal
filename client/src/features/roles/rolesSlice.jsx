import { createSlice } from '@reduxjs/toolkit';
import { configApiSlice } from '../config/configApiSlice';

const initialState = {
    roles: {},
    isLoading: true 
};

const rolesSlice = createSlice({
    name: 'roles',
    initialState,
    reducers: {}, // No manual reducers needed
    extraReducers: (builder) => {
        builder
            // When the getRoles query is fulfilled, store the payload in our state
            .addMatcher(
                configApiSlice.endpoints.getRoles.matchFulfilled,
                (state, action) => {
                    state.roles = action.payload; // payload is the JSON object from the API
                    state.isLoading = false;
                }
            )
            // Handle pending state if you want a global loading flag
            .addMatcher(
                configApiSlice.endpoints.getRoles.matchPending,
                (state, action) => {
                    state.isLoading = true;
                }
            )
            // Handle failure
            .addMatcher(
                configApiSlice.endpoints.getRoles.matchRejected,
                (state, action) => {
                    console.error("Failed to fetch roles, check server logs.");
                    state.isLoading = false;
                }
            )
    }
});

export default rolesSlice.reducer;

// Export selectors to easily access the state in your components
export const selectRoles = (state) => state.roles.roles;
export const selectIsRolesLoading = (state) => state.roles.isLoading;