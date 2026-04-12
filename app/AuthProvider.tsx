"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { installNetworkRuntime } from "@/lib/network-runtime";
import {
  clearAuthSession,
  ensureFreshLoginToken,
  startBackgroundTokenRefresh,
  stopBackgroundTokenRefresh,
} from "@/lib/auth-session";

const AuthContext = createContext({ isAuthenticated: false });

type DecodedLoginToken = {
  exp?: number;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    installNetworkRuntime();
    let active = true;

    const onAuthExpired = () => {
      if (!active) return;
      setIsAuthenticated(false);
      router.push("/login");
    };

    const bootstrap = async () => {
      const token = localStorage.getItem("jwtToken");
      const expiration = localStorage.getItem("tokenExpiration");
      let effectiveExpiration = expiration ? Number(expiration) : 0;

      if (token) {
        try {
          const claims = jwtDecode<DecodedLoginToken>(token);
          if (claims?.exp) {
            effectiveExpiration = claims.exp * 1000;
            localStorage.setItem("tokenExpiration", String(effectiveExpiration));
          }
        } catch {
          // Fall back to stored expiration if token is not decodable.
        }
      }

      if (!token) {
        if (!active) return;
        setIsAuthenticated(false);
        router.push("/login");
        return;
      }

      if (!effectiveExpiration || Date.now() > effectiveExpiration) {
        const refreshed = await ensureFreshLoginToken(1);
        if (!refreshed) {
          clearAuthSession();
          if (!active) return;
          setIsAuthenticated(false);
          router.push("/login");
          return;
        }
      }

      if (!active) return;
      setIsAuthenticated(true);
      startBackgroundTokenRefresh();
    };

    void bootstrap();
    window.addEventListener("auth:expired", onAuthExpired);

    return () => {
      active = false;
      window.removeEventListener("auth:expired", onAuthExpired);
      stopBackgroundTokenRefresh();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
