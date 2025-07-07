import { createSlice } from "@reduxjs/toolkit";
import { createSelector } from "@reduxjs/toolkit";
import { jwtDecode } from 'jwt-decode';

const authSlice = createSlice({
    name: 'auth',
    initialState: { user: null, token: null },
    reducers: {
        setCredentials: (state, action) => {
            const { user, accessToken } = action.payload
            state.user = user
            state.token = accessToken
        },
        logOut: (state, action) => {
            state.user = null
            state.token = null
        }
    },
})

export const { setCredentials, logOut } = authSlice.actions

export default authSlice.reducer

export const selectCurrentUser = (state) => state.auth.user
export const selectCurrentToken = (state) => state.auth.token

// Memoized selectUser function that decodes JWT token to get user info
export const selectUser = createSelector(
    [selectCurrentToken],
    (token) => {
        if (!token) {
            return null;
        }
        
        try {
            const decoded = jwtDecode(token);
            return {
                username: decoded?.UserInfo?.username || '',
                roles: decoded?.UserInfo?.roles || [],
                email: decoded?.UserInfo?.username || '', // username is typically the email
            };
        } catch (error) {
            console.error('Error decoding token in selectUser:', error);
            return null;
        }
    }
)