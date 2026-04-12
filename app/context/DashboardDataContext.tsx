"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";
import { useAccess } from "./AccessContext";
import { httpJson } from "@/lib/http-client";

interface DashboardDataContextValue {
  vendorId: number | null;
  landingData: any | null;
  consoles: any[];
  landingLoading: boolean;
  consolesLoading: boolean;
  refreshLanding: (force?: boolean) => Promise<any | null>;
  refreshConsoles: (force?: boolean) => Promise<any[] | null>;
  setLandingData: (data: any | null) => void;
  setConsoles: (data: any[]) => void;
  moduleCache: Record<string, { data: any; updatedAt: number }>;
  moduleVersions: Record<string, number>;
  setModuleCache: (key: string, data: any) => void;
  bumpModuleVersion: (key: string) => void;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

const LANDING_TTL_MS = 60_000;
const CONSOLES_TTL_MS = 60_000;

function decodeVendorIdFromToken(): number | null {
  try {
    const token = localStorage.getItem("jwtToken");
    if (!token) return null;
    const decoded = jwtDecode<{ sub?: { id?: number } }>(token);
    const id = decoded?.sub?.id;
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { selectedCafeId } = useAccess();
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [landingData, setLandingData] = useState<any | null>(null);
  const [consoles, setConsoles] = useState<any[]>([]);
  const [landingLoading, setLandingLoading] = useState(false);
  const [consolesLoading, setConsolesLoading] = useState(false);
  const [moduleCache, setModuleCacheState] = useState<Record<string, { data: any; updatedAt: number }>>({});
  const [moduleVersions, setModuleVersions] = useState<Record<string, number>>({});
  const lastLandingRef = useRef<number>(0);
  const lastConsolesRef = useRef<number>(0);

  useEffect(() => {
    if (selectedCafeId) {
      const parsed = Number(selectedCafeId);
      setVendorId(Number.isFinite(parsed) ? parsed : null);
      return;
    }
    const decoded = decodeVendorIdFromToken();
    if (decoded) {
      setVendorId(decoded);
    }
  }, [selectedCafeId]);

  const refreshLanding = async (force = false): Promise<any | null> => {
    if (!vendorId) return null;
    const now = Date.now();
    if (!force && landingData && now - lastLandingRef.current < LANDING_TTL_MS) {
      return landingData;
    }
    setLandingLoading(true);
    try {
      const url = `${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}`;
      const data = await httpJson<any>(url, {
        timeoutMs: 10_000,
        retries: 2,
        dedupe: true,
        dedupeKey: `GET:${url}`,
        cacheTtlMs: LANDING_TTL_MS,
      });
      setLandingData(data);
      lastLandingRef.current = Date.now();
      return data;
    } catch (error) {
      console.error("❌ DashboardDataProvider: landing fetch failed", error);
      return null;
    } finally {
      setLandingLoading(false);
    }
  };

  const refreshConsoles = async (force = false): Promise<any[] | null> => {
    if (!vendorId) return null;
    const now = Date.now();
    if (!force && consoles.length > 0 && now - lastConsolesRef.current < CONSOLES_TTL_MS) {
      return consoles;
    }
    setConsolesLoading(true);
    try {
      const url = `${DASHBOARD_URL}/api/getConsoles/vendor/${vendorId}`;
      const data = await httpJson<any>(url, {
        timeoutMs: 10_000,
        retries: 2,
        dedupe: true,
        dedupeKey: `GET:${url}`,
        cacheTtlMs: CONSOLES_TTL_MS,
      });
      setConsoles(Array.isArray(data) ? data : []);
      lastConsolesRef.current = Date.now();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("❌ DashboardDataProvider: consoles fetch failed", error);
      return null;
    } finally {
      setConsolesLoading(false);
    }
  };

  const setModuleCache = (key: string, data: any) => {
    setModuleCacheState((prev) => ({
      ...prev,
      [key]: { data, updatedAt: Date.now() },
    }));
  };

  const bumpModuleVersion = (key: string) => {
    setModuleVersions((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  const value = useMemo(
    () => ({
      vendorId,
      landingData,
      consoles,
      landingLoading,
      consolesLoading,
      refreshLanding,
      refreshConsoles,
      setLandingData,
      setConsoles,
      moduleCache,
      moduleVersions,
      setModuleCache,
      bumpModuleVersion,
    }),
    [vendorId, landingData, consoles, landingLoading, consolesLoading, moduleCache, moduleVersions]
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}
