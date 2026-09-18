import { create } from "zustand";
import { authApi } from "@/api/auth.api";
import { tokenStore } from "@/api/client";
import type { User, SignupRequest, SigninRequest } from "@/types/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  signup: (data: SignupRequest) => Promise<void>;
  signin: (data: SigninRequest) => Promise<void>;
  signout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

function parseApiError(err: any): { message: string; fieldErrors: Record<string, string> } {
  if (err.code === "ERR_NETWORK" || !err.response) {
    return { message: "Unable to connect to the server. Please check your internet and try again.", fieldErrors: {} };
  }
  if (err.code === "ECONNABORTED") {
    return { message: "Request timed out. Please try again.", fieldErrors: {} };
  }

  const data = err.response?.data;
  const status = err.response?.status;

  if (status === 400 && data?.errors) {
    return { message: data.message || "Please fix the errors below.", fieldErrors: data.errors };
  }
  if (status === 409) {
    return { message: data?.message || "An account with this email already exists.", fieldErrors: { email: "This email is already registered. Try signing in instead." } };
  }
  if (status === 401) {
    return { message: data?.message || "Invalid email or password.", fieldErrors: {} };
  }
  if (status === 429) {
    return { message: "Too many attempts. Please wait a minute and try again.", fieldErrors: {} };
  }
  if (status && status >= 500) {
    return { message: "Something went wrong on our end. Please try again shortly.", fieldErrors: {} };
  }

  return { message: data?.message || "Something went wrong. Please try again.", fieldErrors: {} };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  fieldErrors: {},

  signup: async (data) => {
    set({ isLoading: true, error: null, fieldErrors: {} });
    try {
      const res = await authApi.signup(data);
      const { user, tokens } = res.data.data;
      tokenStore.set(tokens);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const { message, fieldErrors } = parseApiError(err);
      set({ isLoading: false, error: message, fieldErrors });
      throw err;
    }
  },

  signin: async (data) => {
    set({ isLoading: true, error: null, fieldErrors: {} });
    try {
      const res = await authApi.signin(data);
      const { user, tokens } = res.data.data;
      tokenStore.set(tokens);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const { message, fieldErrors } = parseApiError(err);
      set({ isLoading: false, error: message, fieldErrors });
      throw err;
    }
  },

  signout: async () => {
    const refreshToken = tokenStore.getRefresh();
    try {
      if (refreshToken) await authApi.signout(refreshToken);
    } catch { /* best-effort */ } finally {
      tokenStore.clear();
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchUser: async () => {
    try {
      const res = await authApi.me();
      set({ user: res.data.data, isAuthenticated: true });
    } catch {
      tokenStore.clear();
      set({ user: null, isAuthenticated: false });
    }
  },

  initialize: async () => {
    const token = tokenStore.getAccess();
    if (token) { await get().fetchUser(); }
    set({ isInitialized: true });
  },

  clearError: () => set({ error: null, fieldErrors: {} }),
}));