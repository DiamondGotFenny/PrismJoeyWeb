import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';

/**
 * Creates a mock Zustand store for testing purposes.
 * This function is a simplified version that performs a shallow merge
 * of the initial state with the original store's state.
 *
 * @param useStore The original Zustand store hook (e.g., `useUserStore`).
 * @param initialState The partial state to override in the mock store.
 * @returns A new store hook for use in tests.
 */
export const createMockStore = <T extends object>(
  useStore: {
    getState: () => T;
    setState: StoreApi<T>['setState'];
  },
  initialState: Partial<T>
): UseBoundStore<StoreApi<T>> => {
  const originalState = useStore.getState();
  const mockState = { ...originalState, ...initialState };

  return create<T>(() => mockState);
};

/**
 * Example Usage:
 *
 * import { useUserStore } from '../../stores/useUserStore';
 * import { createMockStore } from './mockStore';
 *
 * const mockUserStore = createMockStore(useUserStore, {
 *   profileName: 'Mock User',
 *   preferences: {
 *     soundEnabled: false,
 *   },
 * });
 *
 * // In your test:
 * const profileName = mockUserStore().profileName; // 'Mock User'
 *
 */
