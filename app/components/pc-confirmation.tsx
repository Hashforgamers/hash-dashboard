'use client';

import { useEffect, useState } from 'react';
import { useAccess } from '@/app/context/AccessContext';
import { useSocket } from '@/app/context/SocketContext';
import { cafeCall } from '@/lib/cafe-api';

type SessionState = {
  booking_id?: number;
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
          if (!session.booking_id || session.allocation_state !== 'occupied' || session.device_state === 'confirmed') continue;
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
  return <span className="text-[11px] text-amber-300" title="Check the kiosk before starting another booking on this PC.">
    {status === 'failed' ? 'PC start failed' : 'Awaiting PC'}
  </span>;
}
