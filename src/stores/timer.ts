/**
 * Timer Store
 *
 * Global state for the running timer widget using Zustand.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RunningTimer {
  id: number;
  project_id: number;
  project_name: string;
  todo_id: number | null;
  todo_name: string | null;
  description: string | null;
  started_at: string;
  is_billable: boolean;
}

export interface TimerState {
  // State
  runningTimer: RunningTimer | null;
  elapsedSeconds: number;
  isLoading: boolean;
  isPopupOpen: boolean;
  
  // Actions
  setRunningTimer: (timer: RunningTimer | null) => void;
  setElapsedSeconds: (seconds: number) => void;
  incrementElapsed: () => void;
  setLoading: (loading: boolean) => void;
  setIsPopupOpen: (isOpen: boolean) => void;
  clearTimer: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      runningTimer: null,
      elapsedSeconds: 0,
      isLoading: false,
      isPopupOpen: false,

      setRunningTimer: (timer) => set({ runningTimer: timer }),
      
      setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),
      
      incrementElapsed: () => set((state) => ({ 
        elapsedSeconds: state.elapsedSeconds + 1 
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setIsPopupOpen: (isOpen) => set({ isPopupOpen: isOpen }),
      
      clearTimer: () => set({ 
        runningTimer: null, 
        elapsedSeconds: 0 
      }),
    }),
    {
      name: 'lsm-timer',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        runningTimer: state.runningTimer,
        isPopupOpen: state.isPopupOpen // Persist popup state if needed, or remove if not desired
      }),
    }
  )
);

/**
 * Calculate elapsed seconds from started_at
 */
export function calculateElapsedSeconds(startedAt: string): number {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

/**
 * Format seconds as HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
