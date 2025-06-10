import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useCallback } from 'react';
import type { DifficultyLevel, AnswerPayload } from '../services/api';
import { getDifficultyLevels } from '../services/api';

interface APIError {
  type: 'network' | 'server' | 'validation' | 'timeout' | 'unknown';
  message: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number;
}

interface APIRequest {
  isLoading: boolean;
  error: APIError | null;
  lastFetched: number | null;
  data: unknown;
  optimisticData?: unknown;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface APIState {
  // Request tracking
  requests: Record<string, APIRequest>;

  // Cache storage
  cache: Record<string, CacheEntry>;

  // Global API settings
  defaultTTL: number; // Default cache TTL in milliseconds
  enableCaching: boolean;
  retryAttempts: number;
  retryDelay: number;

  // Request deduplication
  pendingRequests: Record<string, Promise<unknown>>;
}

interface APIActions {
  // Request management
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: APIError | string | null) => void;
  setData: (key: string, data: unknown) => void;
  clearRequest: (key: string) => void;

  // Optimistic updates
  setOptimisticData: (key: string, data: unknown) => void;
  clearOptimisticData: (key: string) => void;

  // Cache management
  setCacheEntry: (key: string, data: unknown, ttl?: number) => void;
  getCacheEntry: (key: string) => unknown | null;
  isCacheValid: (key: string) => boolean;
  clearCache: (key?: string) => void;

  // Generic request handler
  executeRequest: <T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      ttl?: number;
      forceRefresh?: boolean;
      enableCache?: boolean;
    }
  ) => Promise<T>;

  // Specific API methods
  fetchDifficultyLevels: (forceRefresh?: boolean) => Promise<DifficultyLevel[]>;

  // Settings
  setDefaultTTL: (ttl: number) => void;
  toggleCaching: () => void;
  setRetrySettings: (attempts: number, delay: number) => void;

  // Reset
  reset: () => void;
}

type APIStore = APIState & APIActions;

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

const initialState: APIState = {
  requests: {},
  cache: {},
  defaultTTL: DEFAULT_TTL,
  enableCaching: true,
  retryAttempts: DEFAULT_RETRY_ATTEMPTS,
  retryDelay: DEFAULT_RETRY_DELAY,
  pendingRequests: {},
};

export const useAPIStore = create<APIStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Request management
      setLoading: (key: string, loading: boolean) => {
        set((state) => {
          if (!state.requests[key]) {
            state.requests[key] = {
              isLoading: false,
              error: null,
              lastFetched: null,
              data: null,
            };
          }
          state.requests[key].isLoading = loading;
        });
      },

      setError: (key: string, error: APIError | string | null) => {
        set((state) => {
          if (!state.requests[key]) {
            state.requests[key] = {
              isLoading: false,
              error: null,
              lastFetched: null,
              data: null,
            };
          }

          // Convert string error to APIError object
          if (typeof error === 'string') {
            state.requests[key].error = {
              type: 'unknown',
              message: error,
              retryable: true,
            };
          } else {
            state.requests[key].error = error;
          }
          state.requests[key].isLoading = false;
        });
      },

      setData: (key: string, data: unknown) => {
        set((state) => {
          if (!state.requests[key]) {
            state.requests[key] = {
              isLoading: false,
              error: null,
              lastFetched: null,
              data: null,
            };
          }
          state.requests[key].data = data;
          state.requests[key].lastFetched = Date.now();
          state.requests[key].error = null;
          state.requests[key].isLoading = false;
        });
      },

      clearRequest: (key: string) => {
        set((state) => {
          delete state.requests[key];
          delete state.pendingRequests[key];
        });
      },

      // Optimistic updates
      setOptimisticData: (key: string, data: unknown) => {
        set((state) => {
          if (!state.requests[key]) {
            state.requests[key] = {
              isLoading: false,
              error: null,
              lastFetched: null,
              data: null,
            };
          }
          state.requests[key].optimisticData = data;
        });
      },

      clearOptimisticData: (key: string) => {
        set((state) => {
          if (state.requests[key]) {
            delete state.requests[key].optimisticData;
          }
        });
      },

      // Cache management
      setCacheEntry: (key: string, data: unknown, ttl?: number) => {
        const effectiveTTL = ttl ?? get().defaultTTL;
        set((state) => {
          state.cache[key] = {
            data,
            timestamp: Date.now(),
            ttl: effectiveTTL,
          };
        });
      },

      getCacheEntry: (key: string) => {
        const state = get();
        const entry = state.cache[key];

        if (!entry) return null;
        if (!state.isCacheValid(key)) {
          get().clearCache(key);
          return null;
        }

        return entry.data;
      },

      isCacheValid: (key: string) => {
        const entry = get().cache[key];
        if (!entry) return false;

        const now = Date.now();
        return now - entry.timestamp < entry.ttl;
      },

      clearCache: (key?: string) => {
        set((state) => {
          if (key) {
            delete state.cache[key];
          } else {
            state.cache = {};
          }
        });
      },

      // Generic request handler with caching and deduplication
      executeRequest: async <T>(
        key: string,
        requestFn: () => Promise<T>,
        options?: {
          ttl?: number;
          forceRefresh?: boolean;
          enableCache?: boolean;
        }
      ): Promise<T> => {
        const {
          ttl,
          forceRefresh = false,
          enableCache = get().enableCaching,
        } = options || {};

        // Check cache first (if enabled and not forcing refresh)
        if (enableCache && !forceRefresh) {
          const cachedData = get().getCacheEntry(key);
          if (cachedData !== null) {
            return cachedData as T;
          }
        }

        // Check if request is already pending (deduplication)
        const pendingRequest = get().pendingRequests[key];
        if (pendingRequest) {
          return pendingRequest as Promise<T>;
        }

        // Start new request
        get().setLoading(key, true);

        const requestPromise = (async () => {
          let lastError: Error | null = null;

          for (let attempt = 0; attempt <= get().retryAttempts; attempt++) {
            try {
              const data = await requestFn();

              // Update request state
              get().setData(key, data);

              // Cache the result if caching is enabled
              if (enableCache) {
                get().setCacheEntry(key, data, ttl);
              }

              // Remove from pending requests
              set((state) => {
                delete state.pendingRequests[key];
              });

              return data;
            } catch (error) {
              lastError = error as Error;

              // If this isn't the last attempt, wait before retrying
              if (attempt < get().retryAttempts) {
                await new Promise((resolve) =>
                  setTimeout(resolve, get().retryDelay * Math.pow(2, attempt))
                );
              }
            }
          }

          // All attempts failed - create structured error
          const apiError: APIError = {
            type: lastError?.name === 'TypeError' ? 'network' : 'unknown',
            message: lastError?.message || 'Request failed',
            retryable: true,
          };

          // Add status code if available (for axios errors)
          if (
            lastError &&
            typeof lastError === 'object' &&
            'response' in lastError
          ) {
            const response = (lastError as { response?: { status?: number } })
              .response;
            if (response?.status) {
              apiError.statusCode = response.status;
              apiError.type = response.status >= 500 ? 'server' : 'validation';
            }
          }

          get().setError(key, apiError);

          // Remove from pending requests
          set((state) => {
            delete state.pendingRequests[key];
          });

          throw lastError;
        })();

        // Store pending request for deduplication
        set((state) => {
          state.pendingRequests[key] = requestPromise;
        });

        return requestPromise;
      },

      // Specific API methods
      fetchDifficultyLevels: async (forceRefresh = false) => {
        return get().executeRequest(
          'difficulty-levels',
          async () => {
            const levels = await getDifficultyLevels();
            // Sort levels by order field
            return levels.sort((a, b) => a.order - b.order);
          },
          {
            forceRefresh,
            ttl: 10 * 60 * 1000, // 10 minutes for difficulty levels
          }
        );
      },

      // Settings
      setDefaultTTL: (ttl: number) => {
        set((state) => {
          state.defaultTTL = Math.max(0, ttl);
        });
      },

      toggleCaching: () => {
        set((state) => {
          state.enableCaching = !state.enableCaching;
          if (!state.enableCaching) {
            state.cache = {};
          }
        });
      },

      setRetrySettings: (attempts: number, delay: number) => {
        set((state) => {
          state.retryAttempts = Math.max(0, Math.min(10, attempts));
          state.retryDelay = Math.max(100, Math.min(10000, delay));
        });
      },

      // Reset
      reset: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },
    })),
    {
      name: 'api-store',
    }
  )
);

const defaultRequestState = {
  isLoading: false,
  error: null,
  lastFetched: null,
  data: null,
};

// Selectors for better performance
export const useAPIRequest = (key: string) =>
  useAPIStore((state) => state.requests[key] || defaultRequestState);

export const useAPILoading = (key: string) =>
  useAPIStore((state) => state.requests[key]?.isLoading || false);

export const useAPIError = (key: string) =>
  useAPIStore((state) => state.requests[key]?.error || null);

export const useAPIData = <T>(key: string) =>
  useAPIStore((state) => {
    const request = state.requests[key];
    if (!request) return null;

    // Return optimistic data if available, otherwise actual data
    return (request.optimisticData || request.data) as T | null;
  });

export const useAPIErrorMessage = (key: string) =>
  useAPIStore((state) => state.requests[key]?.error?.message || null);

export const useDifficultyLevels = () => {
  const request = useAPIRequest('difficulty-levels');
  const fetchDifficultyLevels = useAPIStore(
    (state) => state.fetchDifficultyLevels
  );

  return {
    levels: request.data as DifficultyLevel[] | null,
    isLoading: request.isLoading,
    error: request.error,
    refetch: fetchDifficultyLevels,
    refreshLevels: useCallback(
      () => fetchDifficultyLevels(true),
      [fetchDifficultyLevels]
    ),
  };
};

// Enhanced hook for practice session API calls
export const usePracticeAPI = () => {
  const { executeRequest, setOptimisticData, clearOptimisticData } =
    useAPIStore();

  return {
    // Start a new practice session
    startSession: useCallback(
      async (difficultyId: number, totalQuestions: number) => {
        return executeRequest(
          `practice_session_start_${difficultyId}`,
          async () => {
            const { startPracticeSession } = await import('../services/api');
            return startPracticeSession(difficultyId, totalQuestions);
          },
          {
            enableCache: false, // Don't cache session creation
            ttl: 0,
          }
        );
      },
      [executeRequest]
    ),

    // Submit an answer with optimistic updates
    submitAnswer: useCallback(
      async (payload: AnswerPayload, optimisticResult?: unknown) => {
        const key = `submit_answer_${payload.question_id}`;

        // Set optimistic data for immediate UI feedback
        if (optimisticResult) {
          setOptimisticData(key, optimisticResult);
        }

        try {
          const result = await executeRequest(
            key,
            async () => {
              const { submitAnswer } = await import('../services/api');
              return submitAnswer(payload);
            },
            { enableCache: false }
          );

          // Clear optimistic data on success
          clearOptimisticData(key);
          return result;
        } catch (error) {
          // Revert optimistic update on error
          clearOptimisticData(key);
          throw error;
        }
      },
      [executeRequest, setOptimisticData, clearOptimisticData]
    ),

    // Get next question with caching
    getNextQuestion: useCallback(
      async (sessionId: string) => {
        return executeRequest(
          `next_question_${sessionId}`,
          async () => {
            const { getNextQuestion } = await import('../services/api');
            return getNextQuestion(sessionId);
          },
          {
            enableCache: true,
            ttl: 30 * 1000, // Cache for 30 seconds
          }
        );
      },
      [executeRequest]
    ),
  };
};

export const useAPIStats = () =>
  useAPIStore((state) => ({
    requestCount: Object.keys(state.requests).length,
    cacheSize: Object.keys(state.cache).length,
    pendingCount: Object.keys(state.pendingRequests).length,
    cachingEnabled: state.enableCaching,
  }));
