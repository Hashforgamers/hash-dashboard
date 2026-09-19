"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboardData } from "@/app/context/DashboardDataContext";

export function useModuleCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 120000,
  versionKey?: string,
  enabled = true
) {
  const { moduleCache, moduleVersions, setModuleCache } = useDashboardData();
  const cached = moduleCache[key];
  const effectiveVersionKey = versionKey || key;
  const version = moduleVersions[effectiveVersionKey] || 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const data = cached?.data as T | undefined;
  const latest = useRef({ key, fetcher, cached, ttlMs, version, enabled, setModuleCache });
  latest.current = { key, fetcher, cached, ttlMs, version, enabled, setModuleCache };
  const pending = useRef(new Map<string, { version: number; promise: Promise<T> }>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Stable across cache writes: consumers can safely depend on refresh in effects.
  const refresh = useCallback(async (force = false): Promise<T> => {
    const snapshot = latest.current;
    if (!snapshot.enabled || snapshot.key !== key) throw new Error("Data source is not ready.");
    const active = pending.current.get(key);
    if (active) {
      if (active.version === snapshot.version) return active.promise;
      // An invalidation during a request needs one follow-up, not a request burst.
      await active.promise.catch(() => undefined);
      return refresh(true);
    }
    if (!force && snapshot.cached && Date.now() - snapshot.cached.updatedAt < snapshot.ttlMs) {
      return snapshot.cached.data as T;
    }
    setLoading(true);
    setError(null);
    const promise = Promise.resolve().then(snapshot.fetcher).then(next => {
      if (mounted.current && latest.current.key === key && latest.current.version === snapshot.version) {
        snapshot.setModuleCache(key, next);
      }
      return next;
    }).catch(cause => {
      if (mounted.current && latest.current.key === key) {
        setError(cause instanceof Error ? cause : new Error("Failed to load data."));
      }
      throw cause;
    }).finally(() => {
      pending.current.delete(key);
      if (mounted.current && latest.current.key === key) setLoading(false);
    });
    pending.current.set(key, { version: snapshot.version, promise });
    return promise;
  }, [key]);

  useEffect(() => {
    setError(null);
    setLoading(false);
    if (enabled) void refresh(version > 0).catch(() => undefined);
  }, [key, effectiveVersionKey, version, enabled, refresh]);

  return { data, loading, error, refresh, isFresh: Boolean(cached && Date.now() - cached.updatedAt < ttlMs) };
}
