"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { installNetworkRuntime } from "@/lib/network-runtime";

const AuthContext = createContext({ isAuthenticated: false });

type DecodedLoginToken = {
  exp?: number;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    installNetworkRuntime();
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

    if (!token || !effectiveExpiration || Date.now() > effectiveExpiration) {
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("tokenExpiration");
      setIsAuthenticated(false);
      router.push("/login"); // Redirect to login if token is expired
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
