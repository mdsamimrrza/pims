import { configureStore } from '@reduxjs/toolkit';
import adminUsersReducer from './slices/adminUsersSlice';
import alertsReducer from './slices/alertsSlice';
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import prescriptionsReducer from './slices/prescriptionsSlice';
import toastReducer from './slices/toastSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    adminUsers: adminUsersReducer,
    alerts: alertsReducer,
    auth: authReducer,
    inventory: inventoryReducer,
    prescriptions: prescriptionsReducer,
    toast: toastReducer,
    theme: themeReducer
  }
});