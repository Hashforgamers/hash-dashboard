import { RowsSkeleton } from "@/app/components/ui/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";
import { LiveSessionTiming } from "../live-session-timing";
import { creditAuthHeaders } from "@/lib/credit-auth";
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LiveSessionDue } from "../live-session-due";
import { Search, Gamepad2, Monitor, Headset, Loader2, RefreshCw, UtensilsCrossed, Plus, ChevronDown, ChevronUp, Phone, Mail } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { FaCheck, FaPowerOff } from 'react-icons/fa';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import { mergeConsecutiveBookings } from "@/app/utils/slot-utils";
import QrLiveSessions from "../qr-live-sessions";
import { PcConfirmation, usePcConfirmations } from '../pc-confirmation';
import ExtraBookingOverlay from "../extraBookingOverlay";
import MealDetailsModal from "../mealsDetailmodal";
import { useSocket } from "../../context/SocketContext";

// Keep all your existing helper functions unchanged
export const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const IST_OFFSET_MINUTES = 330; // +05:30
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export const getIstDateKey = (dateInput: string): string | null => {
  const raw = String(dateInput || "").trim();
  if (!raw) return null;

  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
};

export const parseTwelveHourTime = (timeInput: string) => {
  const [time, modifierRaw] = String(timeInput || "").trim().split(" ");
  const [hoursRaw, minutesRaw] = (time || "0:0").split(":");
  const hours = Number(hoursRaw || 0);
  const minutes = Number(minutesRaw || 0);
  const modifier = String(modifierRaw || "").toUpperCase();
  let adjustedHours = hours;
  if (modifier === "PM" && hours < 12) adjustedHours += 12;
  if (modifier === "AM" && hours === 12) adjustedHours = 0;
  return {
    hours: Math.max(0, Math.min(23, adjustedHours)),
    minutes: Math.max(0, Math.min(59, minutes)),
  };
};

export const calculateElapsedTime = (startTime: string, date: string) => {
  if (!startTime) return 0;
  const dateKey = getIstDateKey(date);
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = parseTwelveHourTime(startTime);
  const startUtcMs = Date.UTC(year, month - 1, day, parsed.hours, parsed.minutes, 0) - IST_OFFSET_MS;
  return Math.max(Math.floor((Date.now() - startUtcMs) / 1000), 0);
};

export const calculateExtraTime = (endTime: string, date: string) => {
  if (!endTime) return 0;
  const dateKey = getIstDateKey(date);
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = parseTwelveHourTime(endTime);
  const endUtcMs = Date.UTC(year, month - 1, day, parsed.hours, parsed.minutes, 0) - IST_OFFSET_MS;
  return Math.max(Math.floor((Date.now() - endUtcMs) / 1000), 0);
};

export const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return 0;
  const parseTimeToMinutes = (timeStr: string) => {
    const normalized = String(timeStr || "").trim();
    if (!normalized) return 0;
    const [time, modifierRaw] = normalized.split(" ");
    const [rawHours, rawMinutes] = (time || "0:0").split(":");
    let hours = Number(rawHours || 0);
    const minutes = Number(rawMinutes || 0);
    const modifier = String(modifierRaw || "").toUpperCase();
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const diffMinutes = endMinutes - startMinutes;
  return (diffMinutes >= 0 ? diffMinutes : diffMinutes + 24 * 60) * 60;
};

export const calculateExtraAmount = (extraSeconds: number, ratePerHour = 1) => {
  const extraHours = extraSeconds / 3600;
  return Math.ceil(extraHours * ratePerHour);
};

export const getSafeBookingStartTime = (timeValue: any): string => {
  if (typeof timeValue === "string") {
    return timeValue.split(" - ")[0]?.trim() || "00:00";
  }
  if (Array.isArray(timeValue)) {
    const first = timeValue[0];
    return typeof first === "string" ? first.trim() || "00:00" : "00:00";
  }
  if (timeValue && typeof timeValue === "object") {
    const startCandidate =
      timeValue.start ||
      timeValue.start_time ||
      timeValue.from ||
      timeValue.begin ||
      "";
    return String(startCandidate || "").trim() || "00:00";
  }
  return "00:00";
};

export const formatHistoryDateLabel = (dateInput: any) => {
  if (!dateInput) return "Date not available";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

export const normalizeStatusValue = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

export const normalizeHistoryStatus = (booking: any) => {
  const sessionOutcome = normalizeStatusValue(booking?.sessionOutcome);
  if (sessionOutcome && ["played", "no_show", "not_played"].includes(sessionOutcome)) {
    return sessionOutcome;
  }
  const lifecycle = String(booking?.lifecycleStatus || "").toLowerCase().trim();
  if (lifecycle && !["upcoming", "current"].includes(lifecycle)) {
    return lifecycle;
  }
  const record = booking?.bookingRecordStatus;
  if (typeof record === "string") {
    const normalized = record.toLowerCase().trim();
    if (normalized && !["true", "false"].includes(normalized)) return normalized;
  }
  const status = booking?.status;
  if (typeof status === "string") {
    const normalized = status.toLowerCase().trim();
    if (normalized && !["true", "false", "active"].includes(normalized)) return normalized;
  }
  return "completed";
};

export type HistoryOutcome = "played" | "no_show" | "not_played";

export const getHistoryOutcome = (status: string): HistoryOutcome => {
  const value = normalizeStatusValue(status);
  if (
    ["no_show", "noshow", "discarded", "absent", "missed", "dnf_no_show"].includes(value)
  ) {
    return "no_show";
  }
  if (
    [
      "cancelled",
      "canceled",
      "rejected",
      "verification_failed",
      "payment_failed",
      "failed",
      "expired",
      "void",
      "declined",
      "refunded",
      "not_played",
    ].includes(value)
  ) {
    return "not_played";
  }
  return "played";
};

export const historyStatusChipClass = (status: string) => {
  const outcome = getHistoryOutcome(status);
  if (outcome === "not_played") return "border-red-400/40 bg-red-500/15 text-red-200";
  if (outcome === "no_show") {
    return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  }
  return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
};

export const historyStatusLabel = (status: string, booking?: any) => {
  const serverLabel = String(booking?.sessionOutcomeLabel || "").trim();
  const serverReason = String(booking?.sessionOutcomeReason || "").trim();
  if (serverLabel) {
    if (serverLabel.toLowerCase() === "not played" && serverReason && serverReason.toLowerCase() !== "not played") {
      return `Not Played (${serverReason})`;
    }
    return serverLabel;
  }
  const value = normalizeStatusValue(status);
  const outcome = getHistoryOutcome(status);
  if (outcome === "played") return "Played";
  if (outcome === "no_show") return "No Show";

  // Preserve reason clarity for operations while keeping a stable top-level outcome.
  if (value === "cancelled" || value === "canceled") return "Not Played (Cancelled)";
  if (value === "rejected") return "Not Played (Rejected)";
  if (value === "verification_failed" || value === "payment_failed") return "Not Played (Payment Failed)";
  return "Not Played";
};

export const getConsoleVisual = (consoleType: string) => {
  const value = String(consoleType || "").toLowerCase();
  if (value.includes("ps") || value.includes("playstation") || value.includes("sony")) {
    return { icon: Gamepad2, className: "text-blue-500" };
  }
  if (value.includes("xbox") || value.includes("microsoft")) {
    return { icon: Gamepad2, className: "text-emerald-500" };
  }
  if (value.includes("vr") || value.includes("virtual")) {
    return { icon: Headset, className: "text-purple-400" };
  }
  if (value.includes("pc") || value.includes("computer") || value.includes("desktop")) {
    return { icon: Monitor, className: "text-blue-400" };
  }
  return { icon: Monitor, className: "text-zinc-300" };
};

export const getBookingPhone = (booking: any): string => {
  const raw =
    booking?.customer_phone ||
    booking?.phone ||
    booking?.phone_number ||
    booking?.user_phone ||
    booking?.contactNumber ||
    booking?.contact_number ||
    booking?.customer?.phone ||
    booking?.user?.phone ||
    booking?.customerPhone ||
    "";
  return String(raw || "").trim();
};

export const getBookingEmail = (booking: any): string => {
  const raw =
    booking?.customer_email ||
    booking?.email ||
    booking?.user_email ||
    booking?.contact_email ||
    booking?.customer?.email ||
    booking?.user?.email ||
    "";
  return String(raw || "").trim();
};

export const formatTo12Hour = (hours24: number, minutes: number): string => {
  const boundedHours = Math.max(0, Math.min(23, Number(hours24 || 0)));
  const boundedMinutes = Math.max(0, Math.min(59, Number(minutes || 0)));
  const period = boundedHours >= 12 ? "PM" : "AM";
  const hour12 = boundedHours % 12 || 12;
  return `${hour12}:${String(boundedMinutes).padStart(2, "0")} ${period}`;
};

export const normalizeDisplayTime = (value: any): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*([APap][Mm])$/);
  if (twelveHour) {
    const hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2]);
    const period = twelveHour[3].toUpperCase();
    const normalizedHours = hours % 12 || 12;
    return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  const plainTime = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (plainTime) {
    return formatTo12Hour(Number(plainTime[1]), Number(plainTime[2]));
  }

  const isoTime = raw.match(/T(\d{2}):(\d{2})(?::\d{2})?/);
  if (isoTime) {
    return formatTo12Hour(Number(isoTime[1]), Number(isoTime[2]));
  }

  return raw;
};

export const extractTimeRange = (value: any): { start: string; end: string } => {
  const raw = String(value || "").trim();
  if (!raw) return { start: "", end: "" };
  const parts = raw.split(/\s*-\s*/);
  if (parts.length < 2) return { start: "", end: "" };
  return {
    start: normalizeDisplayTime(parts[0]),
    end: normalizeDisplayTime(parts[1]),
  };
};

export const resolveBookingIdRaw = (slot: any): any => {
  const direct =
    slot?.bookingId ??
    slot?.bookId ??
    slot?.booking_id ??
    slot?.book_id ??
    slot?.booking?.id ??
    slot?.booking?.booking_id ??
    slot?.id;
  if (direct !== null && direct !== undefined && String(direct).trim() !== "") return direct;

  const nested = Array.isArray(slot?.bookings) ? slot.bookings : [];
  for (const row of nested) {
    const nestedId =
      row?.bookingId ??
      row?.bookId ??
      row?.booking_id ??
      row?.book_id ??
      row?.booking?.id ??
      row?.booking?.booking_id ??
      row?.id;
    if (nestedId !== null && nestedId !== undefined && String(nestedId).trim() !== "") return nestedId;
  }

  return null;
};

export const getBookingIdString = (slot: any): string => {
  const bookingId = resolveBookingIdRaw(slot);
  return bookingId === null || bookingId === undefined ? "" : String(bookingId).trim();
};

export const normalizeLiveSlot = (slot: any) => {
  const entries = Array.isArray(slot?.bookings) ? slot.bookings : [];
  const firstEntry = entries[0] || null;
  const lastEntry = entries[entries.length - 1] || firstEntry;
  const rangeFromTime = extractTimeRange(
    slot?.time ?? slot?.slot_time ?? slot?.slotTime ?? firstEntry?.time ?? firstEntry?.slot_time
  );

  const startRaw =
    slot?.startTime ??
    slot?.start_time ??
    slot?.start ??
    firstEntry?.startTime ??
    firstEntry?.start_time ??
    firstEntry?.start ??
    rangeFromTime.start;

  const endRaw =
    slot?.endTime ??
    slot?.end_time ??
    slot?.end ??
    lastEntry?.endTime ??
    lastEntry?.end_time ??
    lastEntry?.end ??
    rangeFromTime.end;

  const bookingId = resolveBookingIdRaw(slot);
  const slotId =
    slot?.slotId ??
    slot?.slot_id ??
    firstEntry?.slotId ??
    firstEntry?.slot_id ??
    null;
  const consoleId =
    slot?.consoleId ??
    slot?.console_id ??
    firstEntry?.consoleId ??
    firstEntry?.console_id ??
    null;
  const consoleNumberRaw =
    slot?.consoleNumber ??
    slot?.console_number ??
    slot?.consoleNo ??
    slot?.console_no ??
    slot?.consoleCode ??
    slot?.console_code ??
    firstEntry?.consoleNumber ??
    firstEntry?.console_number ??
    consoleId;

  const dateRaw =
    slot?.date ??
    slot?.booked_date ??
    slot?.bookedDate ??
    slot?.booking_date ??
    firstEntry?.date ??
    firstEntry?.booked_date ??
    "";

  return {
    ...slot,
    slotId: slotId,
    slot_id: slot?.slot_id ?? slotId,
    bookingId: bookingId,
    bookId: slot?.bookId ?? slot?.book_id ?? bookingId,
    booking_id: slot?.booking_id ?? bookingId,
    book_id: slot?.book_id ?? bookingId,
    startTime: normalizeDisplayTime(startRaw),
    endTime: normalizeDisplayTime(endRaw),
    date: String(dateRaw || "").trim(),
    consoleType:
      slot?.consoleType ??
      slot?.console_type ??
      slot?.consoleName ??
      slot?.console_name ??
      firstEntry?.consoleType ??
      firstEntry?.console_type ??
      slot?.game_name ??
      "Gaming Console",
    consoleNumber: consoleNumberRaw !== null && consoleNumberRaw !== undefined ? String(consoleNumberRaw) : "",
    consoleId: consoleId,
    hasMeals: Boolean(
      slot?.hasMeals ??
      slot?.has_meals ??
      firstEntry?.hasMeals ??
      firstEntry?.has_meals ??
      (Array.isArray(slot?.extra_services) && slot.extra_services.length > 0)
    ),
    customerPhone:
      slot?.customerPhone ??
      slot?.customer_phone ??
      firstEntry?.customer_phone ??
      slot?.phone ??
      slot?.phone_number ??
      slot?.contact_number ??
      "",
    customerEmail:
      slot?.customerEmail ??
      slot?.customer_email ??
      firstEntry?.customer_email ??
      slot?.email ??
      "",
  };
};

export const releaseSlot = async (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any) => {
  try {
    const response = await fetch(`${DASHBOARD_URL}/api/releaseDevice/consoleTypeId/${gameId}/console/${consoleId}/vendor/${vendorId}`, {
      method: "POST",
      headers: creditAuthHeaders(),
      body: JSON.stringify({ bookingStats: {} }),
    });
    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      setRefreshSlots((prev: boolean) => !prev);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dashboard"));
      }
      return {
        ok: true,
        partial_release: Boolean(payload?.partial_release),
        payload,
      };
    }
    throw new Error("Failed to release the slot.");
  } catch (error) {
    console.error("❌ Client: Error calling release API:", error);
    return { ok: false, partial_release: false, payload: null };
  }
};

export const formatDue = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

export interface CurrentSlotsProps {
  currentSlots: any[];
  historyBookings?: any[];
  refreshSlots: boolean;
  setRefreshSlots: (value: boolean | ((prev: boolean) => boolean)) => void;
}
