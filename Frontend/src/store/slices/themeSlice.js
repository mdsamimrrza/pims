import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'pims-theme-mode';
const SYSTEM_PREFERS_DARK = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const getInitialTheme = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return SYSTEM_PREFERS_DARK ? 'dark' : 'light';
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: getInitialTheme()
  },
  reducers: {
    setTheme: (state, action) => {
      const mode = action.payload;
      state.mode = mode;
      localStorage.setItem(STORAGE_KEY, mode);
      
      // Update HTML class and color scheme
      const root = document.documentElement;
      if (mode === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    },
    toggleTheme: (state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      state.mode = newMode;
      localStorage.setItem(STORAGE_KEY, newMode);
      
      // Update HTML class and color scheme
      const root = document.documentElement;
      if (newMode === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
