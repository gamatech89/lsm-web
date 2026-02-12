/**
 * Authentication Store
 *
 * Manages authentication state using Zustand with persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@lsm/types';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),
      
      setUser: (user) =>
        set({ user }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'lsm-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook to get the current user
 */
export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(roles: User['role'] | User['role'][]) {
  const user = useCurrentUser();
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return user ? roleArray.includes(user.role) : false;
}

/**
 * Hook to check if user is admin (by role or is_admin flag)
 */
export function useIsAdmin() {
  const user = useCurrentUser();
  return user ? (user.role === 'admin' || user.is_admin) : false;
}

/**
 * Hook to check if user can manage projects
 */
export function useCanManageProjects() {
  const user = useCurrentUser();
  return user ? (user.role === 'admin' || user.role === 'manager' || user.is_admin) : false;
}
