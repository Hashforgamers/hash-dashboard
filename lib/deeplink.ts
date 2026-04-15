export type QueryValue = string | number | boolean | null | undefined;
type SearchParamsLike = URLSearchParams | { toString(): string; get(name: string): string | null };

export const updateSearchParams = (
  current: SearchParamsLike,
  updates: Record<string, QueryValue>
): URLSearchParams => {
  const next = new URLSearchParams(current.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      next.delete(key);
      return;
    }
    next.set(key, String(value));
  });
  return next;
};

export const readEnumParam = <T extends string>(
  current: SearchParamsLike,
  key: string,
  allowed: readonly T[],
  fallback: T
): T => {
  const raw = current.get(key);
  if (!raw) return fallback;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
};

export const readStringParam = (
  current: SearchParamsLike,
  key: string,
  fallback = ""
): string => {
  const raw = current.get(key);
  return raw == null ? fallback : raw;
};
