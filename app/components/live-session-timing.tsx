'use client';

export function sessionDuration(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(value / 60);
  const tail = String(value % 60).padStart(2, '0');
  return value >= 3600
    ? `${Math.floor(value / 3600)}:${String(minutes % 60).padStart(2, '0')}:${tail}`
    : `${String(minutes).padStart(2, '0')}:${tail}`;
}

export function LiveSessionTiming({ elapsed }: {
  elapsed: number; remaining?: number; progress?: number; overtime?: boolean;
}) {
  return <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground" title="Session duration · hours:minutes:seconds after one hour">{sessionDuration(elapsed)}</span>;
}
