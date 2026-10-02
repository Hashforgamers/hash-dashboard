'use client';

const clock = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
};

export function LiveSessionTiming({elapsed, remaining, progress, overtime = false}: {
  elapsed: number; remaining: number; progress: number; overtime?: boolean;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(progress)));
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold tabular-nums text-slate-100 sm:text-sm">{clock(elapsed)}</span>
      <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${overtime ? 'border-red-500/40 bg-red-500/10 text-red-300' : percent >= 90 ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'}`}>{percent}%</span>
    </div>
    <div role="progressbar" aria-label="Session time used" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700/90 sm:w-28">
      <div className={`h-full transition-all ${overtime ? 'bg-red-500' : percent < 75 ? 'bg-emerald-500' : percent < 90 ? 'bg-yellow-500' : 'bg-orange-500'}`} style={{width: `${percent}%`}} />
    </div>
    <p className={`text-xs tabular-nums ${overtime ? 'text-red-300' : 'text-slate-400'}`}>{overtime ? 'Overtime' : `${clock(remaining)} left`}</p>
  </div>;
}
