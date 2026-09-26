"use client";

import { create } from "zustand";
import api, { setToken, clearToken, getToken } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role?: "CANDIDATE" | "EMPLOYER";
  }) => Promise<User>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.token);
      set({ user: data.user, initialized: true });
      return data.user as User;
    } finally {
      set({ loading: false });
    }
  },

  register: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/register", payload);
      setToken(data.token);
      set({ user: data.user, initialized: true });
      return data.user as User;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — clearing locally is what matters
    }
    clearToken();
    set({ user: null });
  },

  loadUser: async () => {
    if (!getToken()) {
      set({ user: null, initialized: true });
      return;
    }

    set({ loading: true });
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user });
    } catch {
      clearToken();
      set({ user: null });
    } finally {
      set({ loading: false, initialized: true });
    }
  },
}));

export function isSubscribed(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.subscription?.status === "ACTIVE";
}