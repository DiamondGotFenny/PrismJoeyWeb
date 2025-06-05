import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface AppState {
  // Global loading state
  isLoading: boolean;

  // Global error state
  error: string | null;

  // App theme
  theme: 'light' | 'dark';

  // App language
  language: 'zh' | 'en';

  // App initialization state
  isInitialized: boolean;
}

interface AppActions {
  // Loading actions
  setLoading: (loading: boolean) => void;

  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;

  // Theme actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Language actions
  setLanguage: (language: 'zh' | 'en') => void;

  // Initialization actions
  initialize: () => void;

  // Reset all app state
  reset: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  isLoading: false,
  error: null,
  theme: 'light',
  language: 'zh',
  isInitialized: false,
};

export const useAppStore = create<AppStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Loading actions
      setLoading: (loading: boolean) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      // Error actions
      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      // Theme actions
      setTheme: (theme: 'light' | 'dark') => {
        set((state) => {
          state.theme = theme;
        });
        // Persist theme preference
        localStorage.setItem('theme', theme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Language actions
      setLanguage: (language: 'zh' | 'en') => {
        set((state) => {
          state.language = language;
        });
        // Persist language preference
        localStorage.setItem('language', language);
      },

      // Initialization actions
      initialize: () => {
        set((state) => {
          // Load theme from localStorage
          const savedTheme = localStorage.getItem('theme') as
            | 'light'
            | 'dark'
            | null;
          if (savedTheme) {
            state.theme = savedTheme;
          }

          // Load language from localStorage
          const savedLanguage = localStorage.getItem('language') as
            | 'zh'
            | 'en'
            | null;
          if (savedLanguage) {
            state.language = savedLanguage;
          }

          state.isInitialized = true;
        });
      },

      // Reset all app state
      reset: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },
    })),
    {
      name: 'app-store',
    }
  )
);

// Selectors for better performance
export const useAppLoading = () => useAppStore((state) => state.isLoading);
export const useAppError = () => useAppStore((state) => state.error);
export const useAppTheme = () => useAppStore((state) => state.theme);
export const useAppLanguage = () => useAppStore((state) => state.language);
export const useAppInitialized = () =>
  useAppStore((state) => state.isInitialized);
