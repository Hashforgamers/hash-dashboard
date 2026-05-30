'use client';

import { useState, useEffect, useCallback } from 'react';
import { getVendorJwt } from '@/lib/event-api';

const LS_TOKEN = 'ev_jwt';
const LS_EXP   = 'ev_jwt_exp';

const tokenKey = (vendorId: number) => `${LS_TOKEN}:${vendorId}`;
const expKey = (vendorId: number) => `${LS_EXP}:${vendorId}`;

export function useEventsToken(vendorId: number | null) {
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const t = await getVendorJwt(vendorId, 480);
      localStorage.setItem(tokenKey(vendorId), t);
      localStorage.setItem(expKey(vendorId), String(Date.now() + 480 * 60 * 1000));
      localStorage.setItem(LS_TOKEN, t);
      localStorage.setItem(LS_EXP, String(Date.now() + 480 * 60 * 1000));
      setToken(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;
    const stored = localStorage.getItem(tokenKey(vendorId));
    const exp    = localStorage.getItem(expKey(vendorId));
    if (stored && exp && Date.now() < Number(exp)) {
      setToken(stored);
      setLoading(false);
      return;
    }
    fetchToken();
  }, [vendorId, fetchToken]);

  return { token, loading, error, refresh: fetchToken };
}
