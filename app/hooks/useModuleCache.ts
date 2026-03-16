"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/app/context/DashboardDataContext";

export function useModuleCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 120000,
  versionKey?: string
) {
  const { moduleCache, moduleVersions, setModuleCache } = useDashboardData();
  const cached = moduleCache[key];
  const effectiveVersionKey = versionKey || key;
  const version = moduleVersions[effectiveVersionKey] || 0;
  const [loading, setLoading] = useState(false);
  const data = cached?.data as T | undefined;

  const isFresh = useMemo(() => {
    if (!cached) return false;
    return Date.now() - cached.updatedAt < ttlMs;
  }, [cached, ttlMs]);

  const refresh = async (force = false) => {
    if (!force && isFresh && data !== undefined) return data;
    setLoading(true);
    try {
      const next = await fetcher();
      setModuleCache(key, next);
      return next;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFresh || data === undefined) {
      refresh().catch(() => null);
      return;
    }
    if (version > 0) {
      refresh(true).catch(() => null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, effectiveVersionKey, version]);

  return { data: data as T | undefined, loading, refresh, isFresh };
}
