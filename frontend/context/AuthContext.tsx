"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, RoommatePreferences } from "@/types/auth";
import { apiRequest } from "@/lib/api";

interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePreferences: (pref: Partial<RoommatePreferences>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage on client load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("roomilink_token");
        if (storedToken) {
          setToken(storedToken);
          // Fetch current user details from backend
          const res = await apiRequest<{ user: User }>("/auth/me", {
            requiresAuth: true,
          });

          if (res.data?.user) {
            setUser(res.data.user);
          } else {
            // Token is invalid or expired
            localStorage.removeItem("roomilink_token");
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to restore authentication session:", err);
        localStorage.removeItem("roomilink_token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ access_token: string; user: User }>("/auth/login", {
        method: "POST",
        requiresAuth: false,
        body: JSON.stringify({ email, password }),
      });

      if (res.data?.access_token && res.data?.user) {
        localStorage.setItem("roomilink_token", res.data.access_token);
        setToken(res.data.access_token);
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: res.error || "Login failed. Please check your credentials." };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || "An unexpected network error occurred." };
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ access_token: string; user: User }>("/auth/register", {
        method: "POST",
        requiresAuth: false,
        body: JSON.stringify(payload),
      });

      if (res.data?.access_token && res.data?.user) {
        localStorage.setItem("roomilink_token", res.data.access_token);
        setToken(res.data.access_token);
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: res.error || "Registration failed. Please check your inputs." };
      }
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || "An unexpected network error occurred." };
    }
  };

  const logout = () => {
    localStorage.removeItem("roomilink_token");
    setToken(null);
    setUser(null);
  };

  const updatePreferences = async (
    pref: Partial<RoommatePreferences>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiRequest<{ preferences: RoommatePreferences }>("/auth/preferences", {
        method: "PUT",
        requiresAuth: true,
        body: JSON.stringify(pref),
      });

      if (res.data?.preferences && user) {
        setUser({
          ...user,
          preference: res.data.preferences,
        });
        return { success: true };
      } else {
        return { success: false, error: res.error || "Failed to update lifestyle preferences." };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error while saving preferences." };
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ user: User }>("/auth/me", { requiresAuth: true });
      if (res.data?.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error("Error refreshing user profile:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updatePreferences,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
