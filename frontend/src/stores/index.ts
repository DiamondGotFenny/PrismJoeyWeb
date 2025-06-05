// Import stores for use in helper functions
import { useAppStore } from './useAppStore';
import { useUserStore } from './useUserStore';
import { usePracticeStore } from './usePracticeStore';
import { useNavigationStore } from './useNavigationStore';
import { useAPIStore } from './useAPIStore';

// Export all stores
export {
  useAppStore,
  useAppLoading,
  useAppError,
  useAppTheme,
  useAppLanguage,
  useAppInitialized,
} from './useAppStore';

export {
  useUserStore,
  useUserSelections,
  useUserPreferences,
  useUserProgress,
  useUserValidation,
} from './useUserStore';

export {
  usePracticeStore,
  usePracticeSession,
  usePracticeQuestion,
  usePracticeAnswer,
  usePracticeProgress,
  usePracticeUI,
  usePracticeHelp,
} from './usePracticeStore';

export {
  useNavigationStore,
  useNavigationFlow,
  useCurrentStep,
  useNavigationSummary,
  useCanProceed,
  useSessionStatus,
} from './useNavigationStore';

export {
  useAPIStore,
  useAPIRequest,
  useAPILoading,
  useAPIError,
  useAPIData,
  useDifficultyLevels,
  useAPIStats,
} from './useAPIStore';

// Re-export types from API for convenience
export type {
  DifficultyLevel,
  Question,
  PracticeSession,
  AnswerPayload,
  HelpResponse,
} from '../services/api';

// Store initialization helper
export const initializeStores = () => {
  // Initialize app store with saved preferences
  const { initialize } = useAppStore.getState();
  initialize();

  console.log('Zustand stores initialized');
};

// Development helpers
export const getStoreStates = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      app: useAppStore.getState(),
      user: useUserStore.getState(),
      practice: usePracticeStore.getState(),
      navigation: useNavigationStore.getState(),
      api: useAPIStore.getState(),
    };
  }
  return null;
};

export const resetAllStores = () => {
  if (process.env.NODE_ENV === 'development') {
    useAppStore.getState().reset();
    useUserStore.getState().resetUser();
    usePracticeStore.getState().reset();
    useNavigationStore.getState().reset();
    useAPIStore.getState().reset();
    console.log('All stores reset');
  }
};
