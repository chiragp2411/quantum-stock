"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
}

function getStoredAuth(): AuthState {
  if (typeof window === "undefined") {
    return { token: null, username: null, isAuthenticated: false };
  }
  const token = localStorage.getItem("qs_token");
  const username = localStorage.getItem("qs_username");
  return { token, username, isAuthenticated: !!token };
}

export function useAuth() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    username: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(getStoredAuth());
    setLoading(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post("/api/auth/login", { username, password });
      const { access_token, username: uname } = res.data;
      localStorage.setItem("qs_token", access_token);
      localStorage.setItem("qs_username", uname);
      setAuth({ token: access_token, username: uname, isAuthenticated: true });
      router.push("/dashboard");
    },
    [router]
  );

  const signup = useCallback(
    async (username: string, password: string) => {
      const res = await api.post("/api/auth/signup", { username, password });
      const { access_token, username: uname } = res.data;
      localStorage.setItem("qs_token", access_token);
      localStorage.setItem("qs_username", uname);
      setAuth({ token: access_token, username: uname, isAuthenticated: true });
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("qs_token");
    localStorage.removeItem("qs_username");
    setAuth({ token: null, username: null, isAuthenticated: false });
    router.push("/");
  }, [router]);

  return { ...auth, loading, login, signup, logout };
}
