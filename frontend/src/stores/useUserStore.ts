import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DifficultyLevel } from '../services/api';

interface UserPreferences {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  autoAdvance: boolean;
  showHints: boolean;
  preferredQuestionCount: number;
}

interface UserProgress {
  totalSessionsCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageAccuracy: number;
  streakCount: number;
  bestStreak: number;
  lastSessionDate: string | null;
  favoriteSubjects: string[];
  completedDifficulties: number[];
}

interface UserState {
  // User selections in the flow
  selectedGrade: string | null;
  selectedSubject: string | null;
  selectedMathOption: string | null;
  currentDifficulty: DifficultyLevel | null;

  // User preferences
  preferences: UserPreferences;

  // User progress tracking
  progress: UserProgress;

  // Profile info (future use)
  profileName: string | null;
  avatar: string | null;
}

interface UserActions {
  // Selection actions
  setSelectedGrade: (grade: string) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedMathOption: (option: string) => void;
  setCurrentDifficulty: (difficulty: DifficultyLevel | null) => void;

  // Clear selections
  clearSelections: () => void;
  clearFromGrade: () => void;
  clearFromSubject: () => void;
  clearFromMathOption: () => void;

  // Preferences actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  toggleAutoAdvance: () => void;
  toggleHints: () => void;
  setPreferredQuestionCount: (count: number) => void;

  // Progress actions
  updateProgress: (progress: Partial<UserProgress>) => void;
  incrementSessionsCompleted: () => void;
  incrementQuestionsAnswered: () => void;
  incrementCorrectAnswers: () => void;
  updateStreak: (isCorrect: boolean) => void;
  addFavoriteSubject: (subject: string) => void;
  addCompletedDifficulty: (difficultyId: number) => void;

  // Profile actions
  setProfileName: (name: string) => void;
  setAvatar: (avatar: string) => void;

  // Validation helpers
  canProceedToSubject: () => boolean;
  canProceedToMathOptions: () => boolean;
  canProceedToDifficulty: () => boolean;
  canStartPractice: () => boolean;

  // Reset actions
  resetSelections: () => void;
  resetProgress: () => void;
  resetUser: () => void;
}

type UserStore = UserState & UserActions;

const defaultPreferences: UserPreferences = {
  soundEnabled: true,
  hapticEnabled: true,
  autoAdvance: false,
  showHints: true,
  preferredQuestionCount: 10,
};

const defaultProgress: UserProgress = {
  totalSessionsCompleted: 0,
  totalQuestionsAnswered: 0,
  totalCorrectAnswers: 0,
  averageAccuracy: 0,
  streakCount: 0,
  bestStreak: 0,
  lastSessionDate: null,
  favoriteSubjects: [],
  completedDifficulties: [],
};

const initialState: UserState = {
  selectedGrade: null,
  selectedSubject: null,
  selectedMathOption: null,
  currentDifficulty: null,
  preferences: defaultPreferences,
  progress: defaultProgress,
  profileName: null,
  avatar: null,
};

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Selection actions
        setSelectedGrade: (grade: string) => {
          set((state) => {
            state.selectedGrade = grade;
            // Clear downstream selections when grade changes
            state.selectedSubject = null;
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        setSelectedSubject: (subject: string) => {
          set((state) => {
            state.selectedSubject = subject;
            // Clear downstream selections when subject changes
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        setSelectedMathOption: (option: string) => {
          set((state) => {
            state.selectedMathOption = option;
            // Clear downstream selections when math option changes
            state.currentDifficulty = null;
          });
        },

        setCurrentDifficulty: (difficulty: DifficultyLevel | null) => {
          set((state) => {
            state.currentDifficulty = difficulty;
          });
        },

        // Clear selections
        clearSelections: () => {
          set((state) => {
            state.selectedGrade = null;
            state.selectedSubject = null;
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        clearFromGrade: () => {
          set((state) => {
            state.selectedGrade = null;
            state.selectedSubject = null;
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        clearFromSubject: () => {
          set((state) => {
            state.selectedSubject = null;
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        clearFromMathOption: () => {
          set((state) => {
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        // Preferences actions
        updatePreferences: (preferences: Partial<UserPreferences>) => {
          set((state) => {
            Object.assign(state.preferences, preferences);
          });
        },

        toggleSound: () => {
          set((state) => {
            state.preferences.soundEnabled = !state.preferences.soundEnabled;
          });
        },

        toggleHaptic: () => {
          set((state) => {
            state.preferences.hapticEnabled = !state.preferences.hapticEnabled;
          });
        },

        toggleAutoAdvance: () => {
          set((state) => {
            state.preferences.autoAdvance = !state.preferences.autoAdvance;
          });
        },

        toggleHints: () => {
          set((state) => {
            state.preferences.showHints = !state.preferences.showHints;
          });
        },

        setPreferredQuestionCount: (count: number) => {
          set((state) => {
            state.preferences.preferredQuestionCount = Math.max(
              5,
              Math.min(20, count)
            );
          });
        },

        // Progress actions
        updateProgress: (progress: Partial<UserProgress>) => {
          set((state) => {
            Object.assign(state.progress, progress);
            // Recalculate average accuracy
            if (state.progress.totalQuestionsAnswered > 0) {
              state.progress.averageAccuracy =
                (state.progress.totalCorrectAnswers /
                  state.progress.totalQuestionsAnswered) *
                100;
            }
          });
        },

        incrementSessionsCompleted: () => {
          set((state) => {
            state.progress.totalSessionsCompleted += 1;
            state.progress.lastSessionDate = new Date().toISOString();
          });
        },

        incrementQuestionsAnswered: () => {
          set((state) => {
            state.progress.totalQuestionsAnswered += 1;
          });
        },

        incrementCorrectAnswers: () => {
          set((state) => {
            state.progress.totalCorrectAnswers += 1;
            // Recalculate average accuracy
            state.progress.averageAccuracy =
              (state.progress.totalCorrectAnswers /
                state.progress.totalQuestionsAnswered) *
              100;
          });
        },

        updateStreak: (isCorrect: boolean) => {
          set((state) => {
            if (isCorrect) {
              state.progress.streakCount += 1;
              if (state.progress.streakCount > state.progress.bestStreak) {
                state.progress.bestStreak = state.progress.streakCount;
              }
            } else {
              state.progress.streakCount = 0;
            }
          });
        },

        addFavoriteSubject: (subject: string) => {
          set((state) => {
            if (!state.progress.favoriteSubjects.includes(subject)) {
              state.progress.favoriteSubjects.push(subject);
            }
          });
        },

        addCompletedDifficulty: (difficultyId: number) => {
          set((state) => {
            if (!state.progress.completedDifficulties.includes(difficultyId)) {
              state.progress.completedDifficulties.push(difficultyId);
            }
          });
        },

        // Profile actions
        setProfileName: (name: string) => {
          set((state) => {
            state.profileName = name;
          });
        },

        setAvatar: (avatar: string) => {
          set((state) => {
            state.avatar = avatar;
          });
        },

        // Validation helpers
        canProceedToSubject: () => {
          const state = get();
          return Boolean(state.selectedGrade);
        },

        canProceedToMathOptions: () => {
          const state = get();
          return Boolean(state.selectedGrade && state.selectedSubject);
        },

        canProceedToDifficulty: () => {
          const state = get();
          return Boolean(
            state.selectedGrade &&
              state.selectedSubject &&
              (state.selectedSubject !== 'mathematics' ||
                state.selectedMathOption)
          );
        },

        canStartPractice: () => {
          const state = get();
          return Boolean(
            state.selectedGrade &&
              state.selectedSubject &&
              (state.selectedSubject !== 'mathematics' ||
                state.selectedMathOption) &&
              state.currentDifficulty
          );
        },

        // Reset actions
        resetSelections: () => {
          set((state) => {
            state.selectedGrade = null;
            state.selectedSubject = null;
            state.selectedMathOption = null;
            state.currentDifficulty = null;
          });
        },

        resetProgress: () => {
          set((state) => {
            state.progress = { ...defaultProgress };
          });
        },

        resetUser: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },
      })),
      {
        name: 'user-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          selectedGrade: state.selectedGrade,
          selectedSubject: state.selectedSubject,
          selectedMathOption: state.selectedMathOption,
          preferences: state.preferences,
          progress: state.progress,
          profileName: state.profileName,
          avatar: state.avatar,
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

// Selectors for better performance
export const useUserSelections = () =>
  useUserStore((state) => ({
    grade: state.selectedGrade,
    subject: state.selectedSubject,
    mathOption: state.selectedMathOption,
    difficulty: state.currentDifficulty,
  }));

export const useUserPreferences = () =>
  useUserStore((state) => state.preferences);
export const useUserProgress = () => useUserStore((state) => state.progress);
export const useUserValidation = () =>
  useUserStore((state) => ({
    canProceedToSubject: state.canProceedToSubject(),
    canProceedToMathOptions: state.canProceedToMathOptions(),
    canProceedToDifficulty: state.canProceedToDifficulty(),
    canStartPractice: state.canStartPractice(),
  }));
