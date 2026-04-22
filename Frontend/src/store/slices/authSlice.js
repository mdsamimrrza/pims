import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getCurrentUser, getApiMessage } from '../../api/pimsApi';
import {
  clearSession,
  getStoredRole,
  getStoredToken,
  getStoredUser,
  getStoredLoginTime,
  isValidRole,
  updateStoredUser
} from '../../utils/session';

function getInitialState() {
  const token = getStoredToken();
  const user = getStoredUser();
  const role = user?.role;

  return {
    status: token ? 'idle' : 'anonymous',
    token: token || '',
    user: user || null,
    role: isValidRole(role) ? role : getStoredRole(),
    lastLoginAt: getStoredLoginTime() || '',
    errorMessage: ''
  };
}

export const hydrateAuthSession = createAsyncThunk(
  'auth/hydrateAuthSession',
  async (_arg, thunkApi) => {
    const token = getStoredToken();

    if (!token) {
      return { token: '', user: null, role: '' };
    }

    try {
      const data = await getCurrentUser();
      const user = data?.user || null;

      if (user) {
        updateStoredUser(user);
      }

      return {
        token,
        user,
        role: user?.role || getStoredRole(),
        lastLoginAt: getStoredLoginTime() || new Date().toISOString()
      };
    } catch (error) {
      clearSession();
      return thunkApi.rejectWithValue(getApiMessage(error, 'Session expired. Please log in again.'));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setAuthenticatedSession(state, action) {
      const token = action.payload?.token || '';
      const user = action.payload?.user || null;
      const role = user?.role;

      if (token && !isValidRole(role)) {
        state.status = 'anonymous';
        state.token = '';
        state.user = null;
        state.role = '';
        state.errorMessage = 'Invalid session role';
        return;
      }

      state.status = token ? 'authenticated' : 'anonymous';
      state.token = token;
      state.user = user;
      state.role = isValidRole(role) ? role : getStoredRole();
      state.lastLoginAt = getStoredLoginTime() || new Date().toISOString();
      state.errorMessage = '';
    },
    clearAuthState(state) {
      state.status = 'anonymous';
      state.token = '';
      state.user = null;
      state.role = '';
      state.errorMessage = '';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuthSession.pending, (state) => {
        state.status = 'checking';
        state.errorMessage = '';
      })
      .addCase(hydrateAuthSession.fulfilled, (state, action) => {
        const token = action.payload?.token || '';
        const user = action.payload?.user || null;
        const role = action.payload?.role || user?.role || '';

        if (token && !isValidRole(role)) {
          clearSession();
          state.status = 'anonymous';
          state.token = '';
          state.user = null;
          state.role = '';
          state.errorMessage = 'Invalid session role';
          return;
        }

        state.status = token ? 'authenticated' : 'anonymous';
        state.token = token;
        state.user = user;
        state.role = role;
        state.lastLoginAt = action.payload?.lastLoginAt || getStoredLoginTime() || '';
        state.errorMessage = '';
      })
      .addCase(hydrateAuthSession.rejected, (state, action) => {
        state.status = 'anonymous';
        state.token = '';
        state.user = null;
        state.role = '';
        state.errorMessage = action.payload || 'Authentication check failed';
      });
  }
});

export const { setAuthenticatedSession, clearAuthState } = authSlice.actions;
export default authSlice.reducer;