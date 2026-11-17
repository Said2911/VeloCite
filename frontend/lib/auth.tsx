"use client";
// lib/auth.tsx
// Auth + favorites state shared across the app

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import type { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  ready: boolean;                       // initial token check finished
  favoriteIds: Set<string>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  toggleFavorite: (listingId: string) => Promise<boolean>;  // returns new state
  updateUser: (data: { full_name?: string; preferred_currency?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    try {
      setFavoriteIds(new Set(await api.getFavoriteIds()));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  // Restore session from a stored token
  useEffect(() => {
    const restore = api.getToken()
      ? api.getMe().then(async (me) => {
          setUser(me);
          await loadFavorites();
        })
      : Promise.resolve();
    restore
      .catch(() => api.setToken(null))
      .finally(() => setReady(true));
  }, [loadFavorites]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.access_token);
    setUser(res.user);
    await loadFavorites();
  }, [loadFavorites]);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res = await api.register(email, password, fullName);
    api.setToken(res.access_token);
    setUser(res.user);
    setFavoriteIds(new Set());
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setFavoriteIds(new Set());
  }, []);

  const toggleFavorite = useCallback(async (listingId: string) => {
    const isFavorite = favoriteIds.has(listingId);
    // optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFavorite) next.delete(listingId); else next.add(listingId);
      return next;
    });
    try {
      if (isFavorite) await api.removeFavorite(listingId);
      else await api.addFavorite(listingId);
      return !isFavorite;
    } catch (e) {
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFavorite) next.add(listingId); else next.delete(listingId);
        return next;
      });
      throw e;
    }
  }, [favoriteIds]);

  const updateUser = useCallback(async (data: { full_name?: string; preferred_currency?: string }) => {
    setUser(await api.updateMe(data));
  }, []);

  const value = useMemo(
    () => ({ user, ready, favoriteIds, login, register, logout, toggleFavorite, updateUser }),
    [user, ready, favoriteIds, login, register, logout, toggleFavorite, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
