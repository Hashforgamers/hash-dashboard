/** Local datetime inputs retain the cafe operator's browser timezone. */
export function localDateTime(date: Date | null): string {
  if (!date || !Number.isFinite(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function suggestedSchedule(start: Date) {
  return {
    end: new Date(start.getTime() + 5 * 60 * 60 * 1000),
    deadline: new Date(start.getTime() - 60 * 60 * 1000),
  };
}

export function quickTournamentStart(choice: 'today' | 'tomorrow' | 'weekend', now = new Date()) {
  const start = new Date(now);
  const days = choice === 'tomorrow' ? 1 : choice === 'weekend' ? (6 - now.getDay() + 7) % 7 : 0;
  start.setDate(start.getDate() + days);
  start.setHours(18, 0, 0, 0);
  if (start <= now) {
    if (choice === 'weekend') start.setDate(start.getDate() + 7);
    else { start.setTime(now.getTime()); start.setHours(start.getHours() + 2, 0, 0, 0); }
  }
  return start;
}

export function playerCapacity(teams: string, teamSize: number): string {
  const count = Number(teams);
  return Number.isInteger(count) && count > 0 && Number.isInteger(teamSize) && teamSize > 0
    ? String(count * teamSize) : '';
}
