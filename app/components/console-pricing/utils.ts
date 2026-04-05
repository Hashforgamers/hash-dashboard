import { normalizeConsoleSlug } from "../console-catalog";
import { PRETTY_LABEL_OVERRIDES, squadMaxPlayersByConsole } from "./constants";
import { PricingState, SquadPricingState } from "./types";

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function parseCurrencyInput(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const toTitleCase = (value: string) =>
  value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export const getConsoleDisplayName = (slug: string, fallback?: string) =>
  String(fallback || PRETTY_LABEL_OVERRIDES[slug] || toTitleCase(slug || "Console")).trim();

const getPricingAliases = (type: string): string[] => {
  const normalized = normalizeConsoleSlug(type);
  if (normalized === "playstation") return ["playstation", "ps5", "ps"];
  if (normalized === "vr_headset") return ["vr_headset", "vr"];
  return [normalized];
};

export const toBackendPricingKey = (type: string): string => {
  const normalized = normalizeConsoleSlug(type);
  if (normalized === "playstation") return "ps5";
  if (normalized === "vr_headset") return "vr";
  return normalized;
};

export const readPricingValue = (pricingPayload: Record<string, unknown>, type: string): number => {
  for (const alias of getPricingAliases(type)) {
    const raw = pricingPayload?.[alias];
    if (raw !== undefined && raw !== null) return parseCurrencyInput(raw);
  }
  return 0;
};

export const normalizePricingState = (raw: PricingState | Record<string, unknown>): PricingState => {
  const next: PricingState = {};
  Object.entries(raw || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeConsoleSlug(key);
    if (!normalizedKey) return;
    if (value && typeof value === "object" && "value" in value) {
      const typedValue = value as { value?: unknown; isValid?: boolean; hasChanged?: boolean };
      next[normalizedKey] = {
        value: parseCurrencyInput(typedValue.value),
        isValid: typedValue.isValid !== false,
        hasChanged: Boolean(typedValue.hasChanged),
      };
      return;
    }
    next[normalizedKey] = {
      value: parseCurrencyInput(value),
      isValid: true,
      hasChanged: false,
    };
  });
  return next;
};

export const normalizeSquadPricing = (rawData: unknown): SquadPricingState => {
  const source =
    (rawData && typeof rawData === "object" ? (rawData as { pricing?: unknown }).pricing || rawData : {}) as Record<
      string,
      unknown
    >;
  const normalized: SquadPricingState = { pc: {} };

  Object.keys(normalized).forEach((group) => {
    const maxPlayers = squadMaxPlayersByConsole[group] || 10;
    const incomingGroup = source?.[group];
    const rules: Record<string, number> = {};

    if (incomingGroup && typeof incomingGroup === "object") {
      Object.entries(incomingGroup as Record<string, unknown>).forEach(([players, discount]) => {
        const playerCount = Number(players);
        if (!Number.isFinite(playerCount) || playerCount < 2 || playerCount > maxPlayers) return;

        const rawDiscount =
          typeof discount === "object" && discount !== null
            ? Number((discount as { discount_percent?: unknown }).discount_percent ?? 0)
            : Number(discount ?? 0);
        if (!Number.isFinite(rawDiscount)) return;

        rules[String(playerCount)] = Math.max(0, Math.min(100, round2(rawDiscount)));
      });
    }

    normalized[group] = rules;
  });

  return normalized;
};

export const discountToFinalUnitAmount = (base: number, discountPercent: number) =>
  round2(Math.max(0, base - (base * Math.max(0, Math.min(90, discountPercent))) / 100));

export const discountToFinalTotalAmount = (base: number, discountPercent: number, players: number) =>
  round2(discountToFinalUnitAmount(base, discountPercent) * Math.max(1, players));

export const finalTotalAmountToDiscount = (base: number, finalTotalAmount: number, players: number) => {
  if (!base || base <= 0) return 0;
  const safePlayers = Math.max(1, players);
  const maxTotal = base * safePlayers;
  const normalizedFinalTotal = Math.max(0, Math.min(maxTotal, finalTotalAmount));
  return round2(((maxTotal - normalizedFinalTotal) / maxTotal) * 100);
};

export const squadRowKey = (group: string, players: number) => `${group}-${players}`;
