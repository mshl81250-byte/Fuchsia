import { useState, useEffect } from "react";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  isGuest: boolean;
  rewardPoints: number;
  referralCode?: string | null;
  createdAt: string;
}

const STORAGE_KEY = "fuchsia_user";
const TOKEN_KEY = "fuchsia_token";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  function saveUser(u: AuthUser, token: string) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  function updateUser(u: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  const isLoggedIn = !!user;
  const isGuest = user?.isGuest ?? false;

  return { user, saveUser, logout, updateUser, isLoggedIn, isGuest };
}

export function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
