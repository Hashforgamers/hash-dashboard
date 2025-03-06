"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext({ isAuthenticated: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    const expiration = localStorage.getItem("tokenExpiration");
    console.log(expiration);

    if (!token || !expiration || new Date().getTime() > Number(expiration)) {
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
