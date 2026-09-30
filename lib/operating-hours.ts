export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type OperatingDay = {
  day: string; open: string; close: string; slotDurationMinutes: number;
  isEnabled: boolean; is24Hours: boolean; hasChanges: boolean;
};
export function normalizeOperatingHours(rows: any[] = []): OperatingDay[] {
  return WEEKDAYS.map(day => {
    const row = rows.find(item => String(item.day).trim().toLowerCase().slice(0, 3) === day);
    const time = (value: unknown, fallback: string) => {
      const raw = String(value || '');
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) return raw.slice(0, 5);
      const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return fallback;
      return `${String(Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${match[2]}`;
    };
    const open = time(row?.open, '09:00');
    const close = time(row?.close, '18:00');
    return { day, open, close, slotDurationMinutes: Number(row?.slotDurationMinutes) || 30,
      isEnabled: row?.isEnabled ?? false, is24Hours: open === close, hasChanges: false };
  });
}
export function validateOperatingDay(day: OperatingDay): string | null {
  if (!Number.isInteger(day.slotDurationMinutes) || day.slotDurationMinutes < 15 || day.slotDurationMinutes > 240)
    return 'Slot duration must be a whole number between 15 and 240 minutes.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.close))
    return 'Enter valid opening and closing times.';
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const window = (minutes(day.close) - minutes(day.open) + 1440) % 1440 || 1440;
  if (day.isEnabled && window < day.slotDurationMinutes) return 'The operating window must contain at least one complete slot.';
  return null;
}
