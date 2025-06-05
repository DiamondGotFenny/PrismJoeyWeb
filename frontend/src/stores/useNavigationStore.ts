import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DifficultyLevel } from '../services/api';

export type NavigationStep =
  | 'welcome'
  | 'grade-selection'
  | 'subject-selection'
  | 'mathematics-options'
  | 'english-development'
  | 'general-knowledge-development'
  | 'difficulty-selection'
  | 'practice'
  | 'summary';

interface NavigationFlow {
  grade: string | null;
  subject: string | null;
  mathOption: string | null;
  difficulty: DifficultyLevel | null;
  totalQuestions: number;
}

interface NavigationHistory {
  step: NavigationStep;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface NavigationState {
  // Current flow state
  currentStep: NavigationStep;
  flow: NavigationFlow;

  // Navigation history
  history: NavigationHistory[];

  // Validation states
  canProceed: boolean;
  hasValidFlow: boolean;

  // Deep linking support
  pendingNavigation: string | null;

  // Session persistence
  sessionStarted: boolean;
  sessionId: string | null;
}

interface NavigationActions {
  // Step navigation
  navigateToStep: (
    step: NavigationStep,
    data?: Record<string, unknown>
  ) => void;
  goBack: () => NavigationStep | null;
  goForward: () => NavigationStep | null;

  // Flow updates
  setGrade: (grade: string) => void;
  setSubject: (subject: string) => void;
  setMathOption: (option: string) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setTotalQuestions: (count: number) => void;

  // Session management
  startSession: (sessionId: string) => void;
  endSession: () => void;

  // Validation
  validateFlow: () => boolean;
  canProceedToStep: (step: NavigationStep) => boolean;

  // Deep linking
  setPendingNavigation: (path: string) => void;
  resolvePendingNavigation: () => string | null;

  // Reset and clear
  resetFlow: () => void;
  clearHistory: () => void;
  reset: () => void;

  // Computed getters
  getCurrentFlow: () => NavigationFlow;
  getNavigationSummary: () => {
    currentStep: NavigationStep;
    completedSteps: NavigationStep[];
    nextStep: NavigationStep | null;
    canGoBack: boolean;
    progress: number;
  };
}

type NavigationStore = NavigationState & NavigationActions;

const initialFlow: NavigationFlow = {
  grade: null,
  subject: null,
  mathOption: null,
  difficulty: null,
  totalQuestions: 10,
};

const initialState: NavigationState = {
  currentStep: 'welcome',
  flow: initialFlow,
  history: [],
  canProceed: false,
  hasValidFlow: false,
  pendingNavigation: null,
  sessionStarted: false,
  sessionId: null,
};

// Define conditional navigation rules
const getNextStep = (
  currentStep: NavigationStep,
  flow: NavigationFlow
): NavigationStep | null => {
  switch (currentStep) {
    case 'welcome':
      return 'grade-selection';
    case 'grade-selection':
      return 'subject-selection';
    case 'subject-selection':
      if (flow.subject === 'mathematics') return 'mathematics-options';
      if (flow.subject === 'english') return 'english-development';
      if (flow.subject === 'general-knowledge')
        return 'general-knowledge-development';
      return 'difficulty-selection';
    case 'mathematics-options':
    case 'english-development':
    case 'general-knowledge-development':
      return 'difficulty-selection';
    case 'difficulty-selection':
      return 'practice';
    case 'practice':
      return 'summary';
    case 'summary':
      return null; // End of flow
    default:
      return null;
  }
};

const getPreviousStep = (
  currentStep: NavigationStep,
  flow: NavigationFlow
): NavigationStep | null => {
  switch (currentStep) {
    case 'welcome':
      return null;
    case 'grade-selection':
      return 'welcome';
    case 'subject-selection':
      return 'grade-selection';
    case 'mathematics-options':
      return 'subject-selection';
    case 'english-development':
      return 'subject-selection';
    case 'general-knowledge-development':
      return 'subject-selection';
    case 'difficulty-selection':
      if (flow.subject === 'mathematics') return 'mathematics-options';
      if (flow.subject === 'english') return 'english-development';
      if (flow.subject === 'general-knowledge')
        return 'general-knowledge-development';
      return 'subject-selection';
    case 'practice':
      return 'difficulty-selection';
    case 'summary':
      return null; // Don't allow going back from summary
    default:
      return null;
  }
};

export const useNavigationStore = create<NavigationStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Step navigation
        navigateToStep: (
          step: NavigationStep,
          data?: Record<string, unknown>
        ) => {
          set((state) => {
            // Add to history
            state.history.push({
              step: state.currentStep,
              timestamp: Date.now(),
              data,
            });

            state.currentStep = step;
            state.canProceed = get().canProceedToStep(step);
            state.hasValidFlow = get().validateFlow();
          });
        },

        goBack: () => {
          const state = get();
          const previousStep = getPreviousStep(state.currentStep, state.flow);

          if (previousStep) {
            get().navigateToStep(previousStep);
            return previousStep;
          }

          return null;
        },

        goForward: () => {
          const state = get();
          const nextStep = getNextStep(state.currentStep, state.flow);

          if (nextStep && get().canProceedToStep(nextStep)) {
            get().navigateToStep(nextStep);
            return nextStep;
          }

          return null;
        },

        // Flow updates
        setGrade: (grade: string) => {
          set((state) => {
            state.flow.grade = grade;
            // Clear downstream selections
            state.flow.subject = null;
            state.flow.mathOption = null;
            state.flow.difficulty = null;
            state.hasValidFlow = get().validateFlow();
          });
        },

        setSubject: (subject: string) => {
          set((state) => {
            state.flow.subject = subject;
            // Clear downstream selections
            state.flow.mathOption = null;
            state.flow.difficulty = null;
            state.hasValidFlow = get().validateFlow();
          });
        },

        setMathOption: (option: string) => {
          set((state) => {
            state.flow.mathOption = option;
            // Clear downstream selections
            state.flow.difficulty = null;
            state.hasValidFlow = get().validateFlow();
          });
        },

        setDifficulty: (difficulty: DifficultyLevel) => {
          set((state) => {
            state.flow.difficulty = difficulty;
            state.hasValidFlow = get().validateFlow();
          });
        },

        setTotalQuestions: (count: number) => {
          set((state) => {
            state.flow.totalQuestions = Math.max(5, Math.min(20, count));
          });
        },

        // Session management
        startSession: (sessionId: string) => {
          set((state) => {
            state.sessionStarted = true;
            state.sessionId = sessionId;
          });
        },

        endSession: () => {
          set((state) => {
            state.sessionStarted = false;
            state.sessionId = null;
          });
        },

        // Validation
        validateFlow: () => {
          const { flow, currentStep } = get();

          switch (currentStep) {
            case 'welcome':
              return true;
            case 'grade-selection':
              return true;
            case 'subject-selection':
              return Boolean(flow.grade);
            case 'mathematics-options':
              return Boolean(flow.grade && flow.subject === 'mathematics');
            case 'english-development':
              return Boolean(flow.grade && flow.subject === 'english');
            case 'general-knowledge-development':
              return Boolean(
                flow.grade && flow.subject === 'general-knowledge'
              );
            case 'difficulty-selection':
              return Boolean(
                flow.grade &&
                  flow.subject &&
                  (flow.subject !== 'mathematics' || flow.mathOption)
              );
            case 'practice':
              return Boolean(
                flow.grade &&
                  flow.subject &&
                  (flow.subject !== 'mathematics' || flow.mathOption) &&
                  flow.difficulty
              );
            case 'summary':
              return Boolean(get().sessionStarted);
            default:
              return false;
          }
        },

        canProceedToStep: (step: NavigationStep) => {
          const { flow } = get();

          switch (step) {
            case 'welcome':
              return true;
            case 'grade-selection':
              return true;
            case 'subject-selection':
              return Boolean(flow.grade);
            case 'mathematics-options':
              return Boolean(flow.grade && flow.subject === 'mathematics');
            case 'english-development':
              return Boolean(flow.grade && flow.subject === 'english');
            case 'general-knowledge-development':
              return Boolean(
                flow.grade && flow.subject === 'general-knowledge'
              );
            case 'difficulty-selection':
              return Boolean(
                flow.grade &&
                  flow.subject &&
                  (flow.subject !== 'mathematics' || flow.mathOption)
              );
            case 'practice':
              return Boolean(
                flow.grade &&
                  flow.subject &&
                  (flow.subject !== 'mathematics' || flow.mathOption) &&
                  flow.difficulty
              );
            case 'summary':
              return Boolean(get().sessionStarted);
            default:
              return false;
          }
        },

        // Deep linking
        setPendingNavigation: (path: string) => {
          set((state) => {
            state.pendingNavigation = path;
          });
        },

        resolvePendingNavigation: () => {
          const pendingPath = get().pendingNavigation;
          set((state) => {
            state.pendingNavigation = null;
          });
          return pendingPath;
        },

        // Reset and clear
        resetFlow: () => {
          set((state) => {
            state.flow = { ...initialFlow };
            state.currentStep = 'welcome';
            state.hasValidFlow = false;
            state.canProceed = false;
          });
        },

        clearHistory: () => {
          set((state) => {
            state.history = [];
          });
        },

        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },

        // Computed getters
        getCurrentFlow: () => {
          return get().flow;
        },

        getNavigationSummary: () => {
          const state = get();
          const completedSteps: NavigationStep[] = [];

          // Determine completed steps based on current flow
          if (state.flow.grade) completedSteps.push('grade-selection');
          if (state.flow.subject) completedSteps.push('subject-selection');
          if (state.flow.subject === 'mathematics' && state.flow.mathOption) {
            completedSteps.push('mathematics-options');
          } else if (state.flow.subject === 'english') {
            completedSteps.push('english-development');
          } else if (state.flow.subject === 'general-knowledge') {
            completedSteps.push('general-knowledge-development');
          }
          if (state.flow.difficulty)
            completedSteps.push('difficulty-selection');
          if (state.sessionStarted) completedSteps.push('practice');

          const nextStep = getNextStep(state.currentStep, state.flow);
          const canGoBack =
            getPreviousStep(state.currentStep, state.flow) !== null;

          // Calculate progress percentage
          const totalSteps = 6; // Approximate total steps in main flow
          const progress = (completedSteps.length / totalSteps) * 100;

          return {
            currentStep: state.currentStep,
            completedSteps,
            nextStep,
            canGoBack,
            progress: Math.min(100, Math.max(0, progress)),
          };
        },
      })),
      {
        name: 'navigation-store',
        // Only persist the flow state and current step
        partialize: (state) => ({
          currentStep: state.currentStep,
          flow: state.flow,
          sessionStarted: state.sessionStarted,
          sessionId: state.sessionId,
        }),
      }
    ),
    {
      name: 'navigation-store',
    }
  )
);

// Selectors for better performance
export const useNavigationFlow = () =>
  useNavigationStore((state) => state.flow);
export const useCurrentStep = () =>
  useNavigationStore((state) => state.currentStep);
export const useNavigationSummary = () =>
  useNavigationStore((state) => state.getNavigationSummary());
export const useCanProceed = () =>
  useNavigationStore((state) => state.canProceed);
export const useSessionStatus = () =>
  useNavigationStore((state) => ({
    sessionStarted: state.sessionStarted,
    sessionId: state.sessionId,
  }));
