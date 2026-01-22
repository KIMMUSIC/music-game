import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  nickname: string;
  email?: string;
  avatarUrl?: string;
  needsNickname: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  updateNickname: (nickname: string) => void;
  fetchUser: () => Promise<void>;
  fetchUserWithToken: (token: string) => Promise<void>;
  guestLogin: (nickname: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      token: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          token: null,
        }),

      updateNickname: (nickname) =>
        set((state) => ({
          user: state.user ? { ...state.user, nickname, needsNickname: false } : null,
        })),

      fetchUser: async () => {
        const { token } = get();
        try {
          set({ isLoading: true, error: null });
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/auth/me', {
            credentials: 'include',
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            set({
              user: data,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to authenticate',
          });
        }
      },

      fetchUserWithToken: async (token: string) => {
        try {
          set({ isLoading: true, error: null, token });

          const response = await fetch('/auth/me', {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            set({
              user: data,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              token,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Authentication failed',
              token: null,
            });
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to authenticate',
            token: null,
          });
        }
      },

      guestLogin: async (nickname: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await fetch('/auth/guest/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nickname }),
          });

          const data = await response.json();

          if (response.ok) {
            set({
              user: { ...data.user, needsNickname: false },
              isAuthenticated: true,
              isLoading: false,
              error: null,
              token: data.token,
            });
            return { success: true };
          } else {
            set({
              isLoading: false,
              error: data.error || 'Guest login failed',
            });
            return { success: false, error: data.error || 'Guest login failed' };
          }
        } catch (error) {
          console.error('Guest login failed:', error);
          set({
            isLoading: false,
            error: 'Failed to login as guest',
          });
          return { success: false, error: 'Failed to login as guest' };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    },
  ),
);

export default useAuthStore;
