import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DifficultyLevel } from '../services/api';
import { getDifficultyLevels } from '../services/api';

interface APIRequest {
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  data: unknown;
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
  setError: (key: string, error: string | null) => void;
  setData: (key: string, data: unknown) => void;
  clearRequest: (key: string) => void;

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

      setError: (key: string, error: string | null) => {
        set((state) => {
          if (!state.requests[key]) {
            state.requests[key] = {
              isLoading: false,
              error: null,
              lastFetched: null,
              data: null,
            };
          }
          state.requests[key].error = error;
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

          // All attempts failed
          const errorMessage = lastError?.message || 'Request failed';
          get().setError(key, errorMessage);

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

// Selectors for better performance
export const useAPIRequest = (key: string) =>
  useAPIStore(
    (state) =>
      state.requests[key] || {
        isLoading: false,
        error: null,
        lastFetched: null,
        data: null,
      }
  );

export const useAPILoading = (key: string) =>
  useAPIStore((state) => state.requests[key]?.isLoading || false);

export const useAPIError = (key: string) =>
  useAPIStore((state) => state.requests[key]?.error || null);

export const useAPIData = <T>(key: string) =>
  useAPIStore((state) => state.requests[key]?.data as T | null);

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
  };
};

export const useAPIStats = () =>
  useAPIStore((state) => ({
    requestCount: Object.keys(state.requests).length,
    cacheSize: Object.keys(state.cache).length,
    pendingCount: Object.keys(state.pendingRequests).length,
    cachingEnabled: state.enableCaching,
  }));
