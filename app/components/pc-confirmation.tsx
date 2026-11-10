'use client';

import { useEffect, useState } from 'react';
import { useAccess } from '@/app/context/AccessContext';
import { useSocket } from '@/app/context/SocketContext';
import { cafeCall } from '@/lib/cafe-api';

type SessionState = {
  booking_id?: number;
  console_type?: string;
  allocation_state: string;
  device_state: string;
};
type Confirmation = 'pending' | 'failed';

export function usePcConfirmations(enabled: boolean) {
  const { selectedCafeId, activeStaff } = useAccess();
  const { socket } = useSocket();
  const [statuses, setStatuses] = useState(new Map<string, Confirmation>());

  useEffect(() => {
    setStatuses(new Map());
    if (!enabled || !selectedCafeId || !activeStaff) return;
    let active = true;
    let fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const data = await cafeCall<{ items: SessionState[] }>(`/${selectedCafeId}/session-state`);
        const next = new Map<string, Confirmation>();
        for (const session of data.items) {
          if (session.console_type !== 'pc' || !session.booking_id || session.allocation_state !== 'occupied' || !['pending','failed','requested','unconfirmed'].includes(session.device_state)) continue;
          const id = String(session.booking_id);
          if (next.get(id) !== 'failed') next.set(id, session.device_state === 'failed' ? 'failed' : 'pending');
        }
        if (active) setStatuses(next);
      } catch {
        // The next poll or socket update retries. Keep the last known status.
      } finally {
        fetching = false;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15000);
    const events = ['session.updated', 'connect', 'cafe_session_updated', 'booking_slots_updated'];
    events.forEach(event => socket?.on(event, refresh));
    return () => {
      active = false;
      clearInterval(timer);
      events.forEach(event => socket?.off(event, refresh));
    };
  }, [enabled, selectedCafeId, activeStaff?.id, socket]);
  return statuses;
}

export function PcConfirmation({ status }: { status?: Confirmation }) {
  if (!status) return null;
  const message = status === 'failed' ? 'PC start failed. Check the PC software before retrying.' : 'Start recorded; waiting for confirmation from the PC software.';
  return <span tabIndex={0} role="img" aria-label={message} title={message} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/40 text-xs text-amber-400">{status === 'failed' ? '!' : '◷'}</span>;
}
