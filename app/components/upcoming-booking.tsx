import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isFlexBooking } from "@/lib/flex-booking";
import { StatusPill } from "./live-session-due";

import { creditAuthHeaders } from "@/lib/credit-auth"
import { SessionConsoleDialog, type SessionConsole } from "./session-console-dialog";
import UpcomingSlotManager from "./upcoming-slot-manager";
import { BookingQuickView } from "./booking-quick-view";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, Play, X, Gamepad2, Calendar, Clock, User, Search,
  DollarSign, CalendarDays, Users, Timer, AlertCircle, Filter, Phone, Mail,
  BadgeCheck, Calendar as CalendarIcon, ChevronDown, RefreshCw, UtensilsCrossed, Plus, Copy, KeyRound
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'
import { Dispatch, SetStateAction, useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom"; // ✅ ADD THIS IMPORT
import { format } from 'date-fns';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import ResponsiveSearchFilter from "./ResponsiveSearchFilter";
import MealDetailsModal from "./mealsDetailmodal";
import { useSocket } from "../context/SocketContext";
import { useApiClient } from "@/app/hooks/useApiClient";
import { useTimeFormat } from "@/app/hooks/useTimeFormat";


// Helper function for getting platform icons
export function getIcon(system?: string | null): JSX.Element {
  const sys = (system || "").toLowerCase();
  
  if (sys.includes("ps5")) return <Gamepad2 className="w-4 h-4 text-primary" />;
  if (sys.includes("xbox")) return <Gamepad2 className="w-4 h-4 text-emerald-500" />;
  return <Monitor className="w-4 h-4 text-purple-500" />;
}


const IST_TIMEZONE = 'Asia/Kolkata';

const getNowIST = (): Date =>
  new Date(new Date().toLocaleString('en-US', { timeZone: IST_TIMEZONE }));

const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper function for date formatting
const formatDate = (dateStr: string) => {
  try {
    const date = parseBookingDateLocal(dateStr);
    if (!date) return 'Invalid Date';
    const todayIST = getNowIST();
    const todayKey = toDateKey(todayIST);
    const tomorrow = new Date(todayIST);
    tomorrow.setDate(todayIST.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrow);
    const bookingKey = toDateKey(date);
    if (bookingKey === todayKey) return 'Today';
    if (bookingKey === tomorrowKey) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  } catch (error) {
    console.error("Date parsing error:", error);
    return 'Invalid Date';
  }
};


// Helper function for getting time of day
const getTimeOfDay = (time: string) => {
  if (!time) return "all";
  
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

const parseBookingDateLocal = (dateStr: string): Date | null => {
  const raw = String(dateStr || "").trim();
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseMeridiemTime = (timeStr: string) => {
  const [timePart, modifierRaw] = String(timeStr || "").trim().split(" ");
  const [h, m] = (timePart || "0:0").split(":").map(Number);
  const modifier = String(modifierRaw || "").toUpperCase();
  let hour = Number.isFinite(h) ? h : 0;
  const minute = Number.isFinite(m) ? m : 0;
  if (modifier === "PM" && hour < 12) hour += 12;
  if (modifier === "AM" && hour === 12) hour = 0;
  return { hour: Math.max(0, Math.min(23, hour)), minute: Math.max(0, Math.min(59, minute)) };
};

const normalizeBookingTimeValue = (rawTime: any): string => {
  if (typeof rawTime === "string") return rawTime.trim();

  if (Array.isArray(rawTime)) {
    if (rawTime.length >= 2 && rawTime.every((part) => typeof part === "string")) {
      return `${String(rawTime[0]).trim()} - ${String(rawTime[1]).trim()}`;
    }
    return normalizeBookingTimeValue(rawTime[0]);
  }

  if (rawTime && typeof rawTime === "object") {
    const startCandidate =
      rawTime.start ||
      rawTime.start_time ||
      rawTime.from ||
      rawTime.begin ||
      rawTime.open;
    const endCandidate =
      rawTime.end ||
      rawTime.end_time ||
      rawTime.to ||
      rawTime.finish ||
      rawTime.close;
    const start = startCandidate == null ? "" : String(startCandidate).trim();
    const end = endCandidate == null ? "" : String(endCandidate).trim();
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    if (end) return end;
  }

  return "";
};

const getNormalizedBookingTime = (booking: any): string =>
  normalizeBookingTimeValue(
    booking?.time ??
      booking?.timeRange ??
      booking?.time_range ??
      booking?.slot_time ??
      booking?.slotRange ??
      booking?.slot_range
  );

const splitBookingTimeRange = (booking: any): [string, string] => {
  const normalized = getNormalizedBookingTime(booking);
  const parts = normalized.split(" - ").map((part) => part.trim()).filter(Boolean);
  return [parts[0] || "", parts[1] || parts[0] || ""];
};

const withNormalizedBookingTime = (booking: any) => {
  if (!booking || typeof booking !== "object") return booking;
  const normalizedTime = getNormalizedBookingTime(booking);
  return normalizedTime ? { ...booking, time: normalizedTime } : { ...booking };
};

const TERMINAL_BOOKING_STATUSES = ["cancelled", "canceled", "rejected", "completed", "discarded", "no_show"];

const getBookingTimeRange = (booking: any) => {
  if (!booking?.date) return null;
  const slotDate = parseBookingDateLocal(booking.date);
  if (!slotDate) return null;
  const [startRaw, endRaw] = splitBookingTimeRange(booking);
  if (!startRaw || !endRaw) return null;
  const startParsed = parseMeridiemTime(startRaw);
  const endParsed = parseMeridiemTime(endRaw);
  const start = new Date(slotDate);
  start.setHours(startParsed.hour, startParsed.minute, 0, 0);
  const end = new Date(slotDate);
  end.setHours(endParsed.hour, endParsed.minute, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
};

const canStartBookingNow = (booking: any) => {
  const range = getBookingTimeRange(booking);
  if (!range) return false;
  const now = getNowIST();
  return now.getTime() >= range.start.getTime() - 5 * 60 * 1000 && now <= range.end;
};

const canMarkNoShowNow = (booking: any) => {
  const range = getBookingTimeRange(booking);
  if (!range) return false;
  return getNowIST() >= range.start;
};

const getBookingPhone = (booking: any): string => {
  const raw =
    booking?.customer_phone ||
    booking?.phone ||
    booking?.phone_number ||
    booking?.user_phone ||
    booking?.contactNumber ||
    booking?.contact_number ||
    booking?.customer?.phone ||
    booking?.user?.phone ||
    "";
  return String(raw || "").trim();
};

const getBookingEmail = (booking: any): string => {
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


// Back-to-back bookings by the same gamer for the same game are one visit:
// show them as one card (2:00 - 3:00), even when bought separately, with
// different codes or payment states, or across midnight.
const mergeConsecutiveBookings = (bookings: any[]) => {
  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return [];
  }

  const to12Hour = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  };
  const awaitingAcceptance = (booking: any) =>
    String(booking?.bookingRecordStatus || booking?.status || "").toLowerCase() === "pending_acceptance";
  const groupKey = (booking: any) => {
    const userId = booking?.userId || booking?.user_id;
    const owner = userId ? `u${userId}` : `b${booking?.bookingId}`;
    const gameId = booking?.game_id || booking?.gameId || "unknown";
    const reservation = [...(booking?.squadDetails?.desk_console_ids || [])].sort((a: number, b: number) => a - b).join(",");
    // A slot still waiting for the cafe to accept it needs its own Accept/Reject.
    return `${owner}_${gameId}_${awaitingAcceptance(booking) ? "await" : "ok"}_${reservation}`;
  };

  const timed: Array<{ booking: any; start: number; end: number }> = [];
  const untimed: any[] = [];
  for (const booking of bookings) {
    const range = getBookingTimeRange(booking);
    if (range) timed.push({ booking, start: range.start.getTime(), end: range.end.getTime() });
    else untimed.push({ ...booking, merged_booking_ids: [booking?.bookingId], duration: 1 });
  }

  const groups = new Map<string, typeof timed>();
  for (const item of timed) {
    const key = groupKey(item.booking);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const mergedResults: any[] = [...untimed];
  const flush = (run: typeof timed) => {
    const first = run[0].booking;
    const start = run[0].start;
    const end = Math.max(...run.map((r) => r.end));
    const members = run.map((r) => r.booking);
    const codes = Array.from(new Set(members.map((b) => b?.access_code || b?.accessCode).filter(Boolean)));
    const badges = Array.from(new Set(members.map((b) => paymentBadge(b))));
    mergedResults.push({
      ...first,
      time: `${to12Hour(new Date(start))} - ${to12Hour(new Date(end))}`,
      merged_booking_ids: members.map((b) => b.bookingId),
      merged_bookings: members,
      merged_access_codes: codes,
      merged_payment_badge: badges.length > 1 ? (badges.includes("Paid") ? "Part paid" : "Payment due") : badges[0],
      total_price: members.reduce((sum, b) => sum + (Number(b?.slot_price) || 0), 0),
      duration: members.length,
    });
  };

  groups.forEach((items) => {
    items.sort((a, b) => a.start - b.start || Number(a.booking?.bookingId) - Number(b.booking?.bookingId));
    // The same gamer holding the same time twice is a duplicate, not a longer
    // visit: keep each on its own card, flagged, so the extra can be cancelled.
    const duplicates = new Set<any>();
    items.forEach((item, i) => items.forEach((other, j) => {
      if (i !== j && item.start < other.end && other.start < item.end) duplicates.add(item.booking);
    }));
    const runs: Array<typeof timed> = [];
    for (const item of items) {
      const run = runs.find((r) => r[r.length - 1].end === item.start
        && !duplicates.has(item.booking) && !duplicates.has(r[r.length - 1].booking));
      if (run) run.push(item); else runs.push([item]);
    }
    for (const run of runs) {
      flush(run);
      if (duplicates.has(run[0].booking)) mergedResults[mergedResults.length - 1].duplicate_booking = true;
    }
  });

  const startOf = (booking: any) => getBookingTimeRange(booking)?.start.getTime() ?? 0;
  return mergedResults.sort((a, b) => {
    const da = parseBookingDateLocal(a.date);
    const db = parseBookingDateLocal(b.date);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb || startOf(a) - startOf(b);
  });
};


// Component props interface
function paymentBadge(booking: any) {
  const details = booking.squadDetails || {}
  const status = String(booking.settlement_status || booking.settlementStatus || details.settlement_status || details.settlementStatus || "").toLowerCase()
  if (["paid", "completed", "settled", "done"].includes(status)) return "Paid"
  if (["pending", "unpaid", "due"].includes(status) || (booking.payment_use_case || details.payment_use_case || details.paymentUseCase) === "pay_at_cafe") return "Payment due"
  return "Payment unverified"
}

interface UpcomingBookingsProps {
  upcomingBookings: any[];
  vendorId?: string;
  setRefreshSlots: Dispatch<SetStateAction<boolean>>;
}


export function UpcomingBookings({
  upcomingBookings: initialBookings,
  vendorId,
  setRefreshSlots
}: UpcomingBookingsProps): JSX.Element {
  const api = useApiClient();
  const { range: showRange } = useTimeFormat();
  
  const { socket, isConnected, joinVendor } = useSocket()
  
  const [upcomingBookings, setUpcomingBookings] = useState(Array.isArray(initialBookings) ? initialBookings : [])

  // State for modal and console selection
  const [startCard, setStartCard] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [availableConsoles, setAvailableConsoles] = useState<SessionConsole[]>([]);
  const [selectedConsoleIds, setSelectedConsoleIds] = useState<number[]>([]);
  const [requiredConsoleCount, setRequiredConsoleCount] = useState<number>(1);
  const [isPcSquadStart, setIsPcSquadStart] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleError, setConsoleError] = useState("");
  const submitInFlight = useRef(false);
  const consoleRequest = useRef(0);
  const reservedStartConsoles = useRef<number[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [expandedBookingRows, setExpandedBookingRows] = useState<Record<string, boolean>>({});
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateKey(getNowIST()));
  const [timeFilter, setTimeFilter] = useState("all");

  // ✅ State for checking if component is mounted (for portal)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // ✅ ENHANCED: Enhanced meal modal state with add food capability
  const [mealDetailsModal, setMealDetailsModal] = useState({
    isOpen: false,
    bookingId: '',
    customerName: '',
    mode: 'view' as 'view' | 'add',
    hasExistingMeals: false
  });
  const [contactOverlay, setContactOverlay] = useState<{
    open: boolean;
    booking: any | null;
  }>({
    open: false,
    booking: null,
  });

  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    booking: any | null
    repaymentType: "refund" | "credit" | "reschedule" | "none"
    reason: string
    isPaid: boolean
  }>({
    open: false,
    booking: null,
    repaymentType: "refund",
    reason: "",
    isPaid: false
  })
  const [cancelLoading, setCancelLoading] = useState(false)
  const [noShowDialog, setNoShowDialog] = useState<{
    open: boolean
    booking: any | null
    reason: string
  }>({
    open: false,
    booking: null,
    reason: ""
  })
  const [noShowLoading, setNoShowLoading] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-xl z-[10000] text-white font-medium transform transition-all duration-300 ${
      type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        <span>${message}</span>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 4000)
  }

  // Update bookings when props change
  useEffect(() => {
    if (Array.isArray(initialBookings)) {
      setUpcomingBookings(initialBookings)
    }
  }, [initialBookings])

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    const parsedVendorId = Number(vendorId)
    if (!Number.isFinite(parsedVendorId)) return
    
    joinVendor(parsedVendorId)

    function handleUpcomingBooking(data: any) {
      
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      const incomingBookingId = Number(data?.bookingId ?? data?.booking_id ?? data?.bookId ?? data?.book_id);
      if (!data || !eventVendorId) {
        console.warn('Invalid upcoming booking data:', data);
        return;
      }
      
      if (eventVendorId === parsedVendorId && Number.isFinite(incomingBookingId) && (data.status === 'Confirmed' || data.status === 'confirmed')) {
        const normalizedIncoming = withNormalizedBookingTime(data);
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => Number(booking?.bookingId) === incomingBookingId)
          if (!exists) {
            return [{ ...normalizedIncoming, bookingId: incomingBookingId }, ...prev]
          }
          return prev
        })
      }
    }

    function handleBookingUpdate(data: any) {
      
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      const incomingBookingId = Number(data?.bookingId ?? data?.booking_id ?? data?.bookId ?? data?.book_id);
      if (!data || !eventVendorId) {
        console.warn('Invalid booking update data:', data);
        return;
      }
      
      if (eventVendorId === parsedVendorId) {
        const status = String(data.status || "").toLowerCase();
        const normalizedIncoming = withNormalizedBookingTime(data);
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          if ((data.status === 'Confirmed' || data.status === 'confirmed') && Number.isFinite(incomingBookingId) && !prev.some(b => Number(b?.bookingId) === incomingBookingId)) {
            return [{ ...normalizedIncoming, bookingId: incomingBookingId }, ...prev]
          }

          const mapped = prev.map(booking => 
            Number(booking?.bookingId) === incomingBookingId 
              ? { ...booking, ...normalizedIncoming, bookingId: incomingBookingId }
              : booking
          )

          return mapped.filter(booking => {
            const s = String(booking?.status || "").toLowerCase();
            return !TERMINAL_BOOKING_STATUSES.includes(s);
          })
        })

        if (TERMINAL_BOOKING_STATUSES.includes(status) && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("history-booking-add", { detail: data }));
        }
      }
    }

    function handleBookingAccepted(data: any) {
      
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId === parsedVendorId) {
        const normalizedIncoming = withNormalizedBookingTime(data);
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => booking?.bookingId === data.bookingId)
          if (!exists) {
            return [normalizedIncoming, ...prev]
          }
          return prev
        })
      }
    }

    function handleCurrentSlotStart(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      const vendorMatches = !data?.vendorId && !data?.vendor_id
        ? true
        : eventVendorId === parsedVendorId;
      if (!vendorMatches) return;
      const currentBookingId = Number(data?.bookingId ?? data?.bookId);
      if (!Number.isFinite(currentBookingId) || currentBookingId <= 0) return;
      setUpcomingBookings(prev => {
        if (!Array.isArray(prev)) return prev;
        return prev.filter(booking => Number(booking?.bookingId) !== currentBookingId);
      });
    }

    function handleBookingPaymentUpdate(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && vendorId && eventVendorId !== parsedVendorId) return;
      const eventType = String(data?.event || "").toLowerCase();
      const bookingId = Number(data?.bookingId ?? data?.booking_id);
      if (!Number.isFinite(bookingId) || bookingId <= 0) return;
      if (eventType === "meals_added") {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) return prev;
          return prev.map(booking =>
            Number(booking?.bookingId) === bookingId
              ? { ...booking, hasMeals: true }
              : booking
          )
        })
      }
      if (eventType === "booking_cancelled") {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) return prev;
          return prev.filter(booking => Number(booking?.bookingId) !== bookingId);
        })
      }
      if (eventType === "booking_no_show") {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) return prev;
          return prev.filter(booking => Number(booking?.bookingId) !== bookingId);
        })
        const noShowFee = Number(data?.no_show_fee || 0)
        showToast(
          noShowFee > 0
            ? `Marked no-show. Fee retained: ₹${noShowFee.toFixed(0)}`
            : "Marked no-show successfully",
          "success"
        )
      }
    }

    socket.on('upcoming_booking', handleUpcomingBooking)
    socket.on('booking', handleBookingUpdate)
    socket.on('booking_accepted', handleBookingAccepted)
    socket.on('current_slot', handleCurrentSlotStart)
    socket.on('booking_payment_update', handleBookingPaymentUpdate)

    return () => {
      socket.off('upcoming_booking', handleUpcomingBooking)
      socket.off('booking', handleBookingUpdate)
      socket.off('booking_accepted', handleBookingAccepted)
      socket.off('current_slot', handleCurrentSlotStart)
      socket.off('booking_payment_update', handleBookingPaymentUpdate)
    }
  }, [socket, vendorId, isConnected, joinVendor])

  // Filter bookings based on search and date
  const filteredBookings = useMemo(() => {
    if (!Array.isArray(upcomingBookings)) return [];
    
    let filtered = upcomingBookings.filter(booking => booking && booking.date);
    filtered = filtered.filter(booking => {
      try {
        const bookingDate = parseBookingDateLocal(booking.date);
        const selected = parseBookingDateLocal(selectedDate);
        if (!bookingDate || !selected) return false;
        return toDateKey(bookingDate) === toDateKey(selected);
      } catch (error) {
        console.warn('Date filtering error for booking:', booking);
        return false;
      }
    });

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(booking => 
        ((booking.username || '').toLowerCase()).includes(term) ||
        (getBookingPhone(booking).toLowerCase()).includes(term) ||
        ((booking.consoleType || '').toLowerCase()).includes(term)
      );
    }

    if (timeFilter !== "all") {
      filtered = filtered.filter(booking => {
        const [startRaw] = splitBookingTimeRange(booking);
        const timeOfDay = getTimeOfDay(startRaw.split(" ")[0] || "");
        return timeOfDay === timeFilter;
      });
    }

    return filtered;
  }, [upcomingBookings, searchTerm, selectedDate, timeFilter]);

  // Merge consecutive bookings
  const mergedBookings = useMemo(() => 
    mergeConsecutiveBookings(filteredBookings),
    [filteredBookings]
  );

  // 🔧 MOVED: Add debugging to see booking data structure AFTER mergedBookings is defined
  useEffect(() => {
    if (mergedBookings.length > 0) {
      console.log('📊 All booking game_ids:', mergedBookings.map(b => ({
        bookingId: b.bookingId,
        game_id: b.game_id,
        consoleType: b.consoleType,
        hasMeals: b.hasMeals
      })));
    }
  }, [mergedBookings]);

  // Enhanced start session handler with debugging
  const start = (booking: any) => {
    const resolvedSystem = String(
      booking?.game ||
      booking?.system ||
      booking?.consoleType ||
      ""
    ).trim();
    const resolvedGameId = String(
      booking?.game_id ??
      booking?.gameId ??
      booking?.consoleTypeId ??
      ""
    ).trim();
    const resolvedBookingId = String(
      booking?.bookingId ??
      booking?.booking_id ??
      booking?.bookId ??
      booking?.book_id ??
      ""
    ).trim();
    const resolvedVendorId = String(vendorId || "").trim();

    console.log('🚀 Start clicked with params:', {
      booking,
      resolvedSystem,
      resolvedGameId,
      resolvedBookingId,
      resolvedVendorId
    });
    
    if (!resolvedGameId || !resolvedBookingId) {
      console.error('❌ Missing required parameters:', { resolvedGameId, resolvedBookingId, booking });
      showToast("Unable to start session: booking details are incomplete.", "error");
      return;
    }
    
    if (!resolvedVendorId) {
      console.error('❌ VendorId is not available');
      showToast("Unable to start session: vendor is not resolved.", "error");
      return;
    }
    
    setSelectedSystem(resolvedSystem);
    setSelectedGameId(resolvedGameId);
    setSelectedBookingId(resolvedBookingId);
    const consoleGroup = String(
      booking?.squadDetails?.console_group ||
      booking?.squadDetails?.consoleGroup ||
      (String(resolvedSystem || "").toLowerCase().includes("pc") ? "pc" : "")
    ).toLowerCase();
    const pcSquad = Boolean(
      consoleGroup === "pc" &&
      (booking?.squadEnabled || Number(booking?.squadPlayerCount || booking?.squadDetails?.player_count || 1) > 1)
    );
    const neededConsoles = pcSquad
      ? Math.max(1, Number(booking?.squadPlayerCount || booking?.squadDetails?.player_count || 1))
      : 1;
    setIsPcSquadStart(pcSquad);
    setRequiredConsoleCount(neededConsoles);
    setSelectedConsoleIds([]);
    setStartCard(true);
    reservedStartConsoles.current = booking?.squadDetails?.desk_console_ids || [];
    fetchAvailableConsoles(resolvedGameId, resolvedVendorId);
  };

  const fetchAvailableConsoles = async (gameId: string, resolvedVendorId?: string, reservedIds: number[] = reservedStartConsoles.current) => {
    if (!resolvedVendorId) return;
    const requestId = ++consoleRequest.current;
    setIsLoading(true);
    setConsoleError("");
    setSelectedConsoleIds([]);
    setAvailableConsoles([]);
    try {
      const rows = await api.get<any[]>(`${DASHBOARD_URL}/api/getAllDevice/consoleTypeId/${gameId}/vendor/${resolvedVendorId}`, { timeoutMs: 10_000, retries: 2 });
      if (requestId !== consoleRequest.current) return;
      if (!Array.isArray(rows)) throw new Error("Unexpected console response. Please retry.");
      const available = rows.filter((row) => [true, 1, "true", "1"].includes(row?.is_available))
        .map((row) => ({ ...row, consoleId: Number(row.consoleId) }))
        .filter((row) => Number.isSafeInteger(row.consoleId) && row.consoleId > 0);
      const compatible = reservedIds.length ? available.filter(row=>reservedIds.includes(row.consoleId)) : available;
      setAvailableConsoles(Array.from(new Map(compatible.map((row) => [row.consoleId, row])).values()));
      if (reservedIds.length) setSelectedConsoleIds(compatible.map(row=>row.consoleId));
    } catch (error) {
      if (requestId !== consoleRequest.current) return;
      setConsoleError(error instanceof Error ? error.message : "Unable to load consoles. Please retry.");
    } finally {
      if (requestId === consoleRequest.current) setIsLoading(false);
    }
  };

  // Handle session start submission
  const handleSubmit = async () => {
    if (submitInFlight.current || isLoading || selectedConsoleIds.length !== requiredConsoleCount) return;
    const effectiveSelected = selectedConsoleIds.filter((id) => availableConsoles.some((console) => console.consoleId === id));
    if (effectiveSelected.length !== requiredConsoleCount) return;
    if (effectiveSelected.length > 0 && selectedGameId && selectedBookingId) {
      submitInFlight.current = true;
      setIsSubmitting(true);
      setConsoleError("");

      const selectedBookingIdStr = String(selectedBookingId);
      const selectedMergedBooking = mergedBookings.find((booking) => {
        const bookingIdMatch = String(booking?.bookingId) === selectedBookingIdStr;
        const mergedMatch = Array.isArray(booking?.merged_booking_ids)
          ? booking.merged_booking_ids.some((id: any) => String(id) === selectedBookingIdStr)
          : false;
        return bookingIdMatch || mergedMatch;
      });
      const bookingIds = selectedMergedBooking?.merged_booking_ids || [selectedBookingId];

      const primaryConsoleId = effectiveSelected[0];
      const additionalConsoleIds = effectiveSelected.slice(1);

      const url = bookingIds.length > 1
        ? `${DASHBOARD_URL}/api/assignConsoleToMultipleBookings`
        : `${DASHBOARD_URL}/api/updateDeviceStatus/consoleTypeId/${selectedGameId}/console/${primaryConsoleId}/bookingId/${selectedBookingId}/vendor/${vendorId}`;

      const payload = bookingIds.length > 1
        ? {
            console_id: primaryConsoleId,
            game_id: selectedGameId,
            booking_ids: bookingIds,
            vendor_id: vendorId,
            additional_console_ids: isPcSquadStart ? additionalConsoleIds : [],
          }
        : (isPcSquadStart
            ? { additional_console_ids: additionalConsoleIds }
            : null);

      try {
        if (bookingIds.length > 1) {
          await api.post(url, JSON.stringify(payload), {
            headers: creditAuthHeaders(),
            timeoutMs: 12_000,
            retries: 0,
          });
        } else {
          if (payload) {
            await api.post(url, JSON.stringify(payload), {
              headers: creditAuthHeaders(),
              timeoutMs: 12_000,
              retries: 0,
            });
          } else {
            await api.post(url, undefined, { headers: creditAuthHeaders(), timeoutMs: 12_000, retries: 0 });
          }
        }

        setStartCard(false);
        setRefreshSlots((prev) => !prev);
        
        setUpcomingBookings(prev => 
          Array.isArray(prev) ? prev.filter(booking => !bookingIds.includes(booking?.bookingId)) : []
        );
        
      } catch (error) {
        setConsoleError(error instanceof Error ? error.message : "Unable to start the session. Please retry.");
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refresh-dashboard"));
        }
        submitInFlight.current = false;
        setIsSubmitting(false);
      }
    }
  };

  // Handle console selection
  const handleConsoleSelection = (consoleId: number) => {
    if (isSubmitting || isLoading) return;
    setConsoleError("");
    if (!isPcSquadStart) {
      setSelectedConsoleIds([consoleId]);
      return;
    }
    setSelectedConsoleIds((prev) => {
      if (prev.includes(consoleId)) {
        const next = prev.filter((id) => id !== consoleId);
        return next;
      }
      if (prev.length >= requiredConsoleCount) {
        return prev;
      }
      const next = [...prev, consoleId];
      return next;
    });
  };

  // ✅ ENHANCED: Enhanced meal/food icon click handlers
  const handleFoodIconClick = (bookingId: string, customerName: string, hasMeals: boolean) => {
    
    setMealDetailsModal({
      isOpen: true,
      bookingId,
      customerName,
      mode: 'view',
      hasExistingMeals: hasMeals
    });
  };

  const handleAddFoodClick = (bookingId: string, customerName: string) => {
    
    setMealDetailsModal({
      isOpen: true,
      bookingId,
      customerName,
      mode: 'add',
      hasExistingMeals: false
    });
  };

  const closeMealDetailsModal = () => {
    setMealDetailsModal({
      isOpen: false,
      bookingId: '',
      customerName: '',
      mode: 'view',
      hasExistingMeals: false
    });
  };

  const openCancelDialog = (booking: any, isPaid: boolean) => {
    setCancelDialog({
      open: true,
      booking,
      repaymentType: isPaid ? "refund" : "none",
      reason: "",
      isPaid
    })
  }

  const closeCancelDialog = () => {
    setCancelDialog(prev => ({ ...prev, open: false }))
  }

  const openNoShowDialog = (booking: any) => {
    setNoShowDialog({
      open: true,
      booking,
      reason: ""
    })
  }

  const closeNoShowDialog = () => {
    setNoShowDialog(prev => ({ ...prev, open: false }))
  }

  const handleCancelBooking = async () => {
    if (!cancelDialog.booking || !vendorId) return
    const booking = cancelDialog.booking
    const bookingIds = Array.isArray(booking?.merged_booking_ids) && booking.merged_booking_ids.length > 0
      ? booking.merged_booking_ids
      : [booking.bookingId]
    setCancelLoading(true)
    try {
      const payload = {
        booking_ids: bookingIds,
        repayment_type: cancelDialog.isPaid ? cancelDialog.repaymentType : "none",
        reason: cancelDialog.reason || "Cancelled from dashboard"
      }
      const result = await api.post<any, string>(`${BOOKING_URL}/api/bookings/cancel`, JSON.stringify(payload), {
        headers: creditAuthHeaders(),
        timeoutMs: 12_000,
        retries: 0,
      })
      if (!result?.success) {
        throw new Error(result?.message || "Failed to cancel booking")
      }
      setUpcomingBookings(prev => {
        if (!Array.isArray(prev)) return prev
        return prev.filter(b => !bookingIds.includes(b.bookingId))
      })
      setRefreshSlots(prev => !prev)
      showToast(
        cancelDialog.isPaid
          ? `Booking cancelled. Repayment: ${cancelDialog.repaymentType.toUpperCase()}`
          : "Booking cancelled successfully",
        "success"
      )
      closeCancelDialog()
    } catch (error: any) {
      console.error("Cancel booking failed:", error)
      showToast(error?.message || "Failed to cancel booking", "error")
    } finally {
      setCancelLoading(false)
    }
  }

  const handleMarkNoShow = async () => {
    if (!noShowDialog.booking || !vendorId) return
    const booking = noShowDialog.booking
    const bookingIds = Array.isArray(booking?.merged_booking_ids) && booking.merged_booking_ids.length > 0
      ? booking.merged_booking_ids
      : [booking.bookingId]
    setNoShowLoading(true)
    try {
      const payload = {
        booking_ids: bookingIds,
        reason: noShowDialog.reason || "Marked as no-show from dashboard"
      }
      const result = await api.post<any, string>(`${BOOKING_URL}/api/bookings/no-show`, JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
        timeoutMs: 12_000,
        retries: 0,
      })
      if (!result?.success) {
        throw new Error(result?.message || "Failed to mark no-show")
      }
      const noShowIds = Array.isArray(result?.no_show_ids) ? result.no_show_ids.map((id: any) => Number(id)) : []
      setUpcomingBookings(prev => {
        if (!Array.isArray(prev)) return prev
        return prev.filter(b => !noShowIds.includes(Number(b.bookingId)))
      })
      setRefreshSlots(prev => !prev)
      const retainedFee = Number(result?.no_show_fee_total || 0)
      showToast(
        retainedFee > 0
          ? `Marked no-show. Fee retained: ₹${retainedFee.toFixed(0)}`
          : "Marked no-show successfully",
        "success"
      )
      closeNoShowDialog()
    } catch (error: any) {
      console.error("No-show failed:", error)
      showToast(error?.message || "Failed to mark no-show", "error")
    } finally {
      setNoShowLoading(false)
    }
  }

  return (
    <>
      {/* 🚀 FIXED: Proper flex container structure */}
      <div className="upcoming-session-panel dashboard-module dashboard-module-panel h-full flex flex-col overflow-hidden rounded-lg p-3 sm:p-4">
        <SessionConsoleDialog
          open={startCard}
          onClose={() => { setStartCard(false); consoleRequest.current += 1; }}
          consoles={availableConsoles}
          selectedIds={selectedConsoleIds}
          requiredCount={requiredConsoleCount}
          system={selectedSystem}
          loading={isLoading}
          submitting={isSubmitting}
          error={consoleError}
          onSelect={handleConsoleSelection}
          onRetry={() => { if (selectedGameId) fetchAvailableConsoles(selectedGameId, String(vendorId)); }}
          onStart={handleSubmit}
        />

        {/* Header + Search */}
        <div className="mb-3 flex flex-col items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="dash-title">Upcoming</h3>
            <span className="live-session-count">
              {filteredBookings.length}
            </span>
          </div>
          <div className="flex w-full flex-col gap-2">
            <ResponsiveSearchFilter
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              className="w-full"
            />
          </div>
        </div>

        {/* 🚀 FIXED: Scrollable content area that takes remaining space */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {mergedBookings.length === 0 ? (
            <div className="dashboard-module-empty flex h-full flex-col items-center justify-center py-5 px-3">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{searchTerm ? 'No matching bookings' : 'No upcoming bookings'}</p>
              {!isConnected && <p className="text-xs mt-1 text-center">Check connection and filters.</p>}
              <a href="/booking" className="operations-empty-action">New Gaming Session</a>
            </div>
          ) : (
            <div>
              <div className="space-y-2 p-2 sm:space-y-3 sm:p-4 lg:space-y-4">
                <AnimatePresence mode="popLayout">
                  {mergedBookings.map((booking, index) => {
                    const canStartNow = canStartBookingNow(booking);
                    const squadMembers = Array.isArray(booking?.squadMembers) ? booking.squadMembers : [];
                    const squadPlayerCount = Number(
                      booking?.squadPlayerCount ||
                      booking?.squadDetails?.player_count ||
                      (squadMembers.length || 1)
                    );
                    const squadEnabled = Boolean(booking?.squadEnabled || squadPlayerCount > 1);
                    const squadMemberNames = squadMembers
                      .map((member: any) => String(member?.name || "").trim())
                      .filter((value: string) => value.length > 0)
                      .slice(0, 3);
                    const bookingKey = String(booking?.bookingId || "");
                    const expanded = Boolean(expandedBookingRows[bookingKey]);
                    const assignedConsoleIds = Array.isArray(booking?.squadDetails?.assigned_console_ids)
                      ? booking.squadDetails.assigned_console_ids
                      : [];
                    const assignedConsoleLabels = Array.isArray(booking?.squadDetails?.assigned_console_labels)
                      ? booking.squadDetails.assigned_console_labels
                      : [];
                    const appliedControllerQty = Number(
                      booking?.squadDetails?.applied_extra_controller_qty ||
                      booking?.squadDetails?.suggested_extra_controller_qty ||
                      0
                    );
                    const hasMeals = Boolean(booking?.hasMeals);
                    const paymentBadgeLabel = booking?.merged_payment_badge || paymentBadge(booking);
                    const isPaidBooking = paymentBadgeLabel === "Paid";
                    const bookingRecordStatus = String(
                      booking?.bookingRecordStatus || booking?.status || ""
                    ).toLowerCase();
                    const lifecycleStatus = String(booking?.lifecycleStatus || "").toLowerCase();
                    const canCancel = !["current", "completed"].includes(lifecycleStatus) &&
                      !TERMINAL_BOOKING_STATUSES.includes(bookingRecordStatus);
                    const canNoShow = canCancel && canMarkNoShowNow(booking);
                    return (
                    <motion.div
                      key={booking.bookingId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      layout
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.02 
                      }}
                      className="dashboard-module-card rounded-lg p-3 transition-colors duration-200"
                    >
                      <div className="space-y-3">
                        {/* Name and payment on one line; time on its own line so it never truncates. */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContactOverlay({ open: true, booking });
                              }}
                              className="truncate text-left text-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                              aria-label={`View contact and booking details for ${booking.username || 'Guest User'}`}
                              title="View booking and gamer details"
                            >
                              {booking.username || "Guest User"}
                            </button>
                            {squadEnabled && (
                              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                                x{squadPlayerCount}
                              </span>
                            )}
                            {squadEnabled && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedBookingRows((prev) => ({
                                    ...prev,
                                    [bookingKey]: !expanded,
                                  }))
                                }
                                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title={expanded ? "Collapse squad details" : "Expand squad details"}
                              >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </div>
                          <StatusPill
                            tone={isPaidBooking ? "ok" : "attention"}
                            label={paymentBadgeLabel}
                            className="shrink-0"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
                            <Clock className="h-3 w-3 shrink-0" />
                            {booking.time ? showRange(booking.time) : "No time set"}
                            {isFlexBooking(booking) && <span className="ml-1.5 rounded border border-border px-1 text-[10px] font-medium uppercase text-muted-foreground" title="Custom start time: exact minutes, not slot times">Custom</span>}
                          </span>
                          {booking.duplicate_booking && (
                            <StatusPill
                              tone="alert"
                              label="Duplicate"
                              className="h-5 text-xs"
                              title="This gamer has another booking for the same time. Cancel the extra one so they are not billed twice."
                            />
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">Access code</span>
                            <span className="select-all font-mono text-sm font-semibold tracking-widest text-foreground">
                              {(booking.merged_access_codes?.length ? booking.merged_access_codes.join(" · ") : null) || booking.access_code || booking.accessCode || "Unavailable"}
                            </span>
                          </div>
                          {(booking.access_code || booking.accessCode) && (
                            <button
                              type="button"
                              aria-label="Copy gamer access code"
                              title="Copy code to share with the gamer"
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                              onClick={async (event) => {
                                event.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(String(booking.access_code || booking.accessCode));
                                  showToast("Access code copied. Share it with the gamer to start at the kiosk.");
                                } catch {
                                  showToast("Couldn't copy. Select the access code and copy it manually.", "error");
                                }
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {squadEnabled && squadMemberNames.length > 0 && !expanded && (
                          <p className="truncate text-xs text-muted-foreground">
                            Members: {squadMemberNames.join(", ")}
                            {squadPlayerCount - squadMemberNames.length > 0
                              ? ` +${squadPlayerCount - squadMemberNames.length} more`
                              : ""}
                          </p>
                        )}
                        {squadEnabled && expanded && (
                          <div className="rounded-md border border-border bg-primary/10 p-1.5 text-xs text-foreground">
                            <p className="font-semibold">Squad Details</p>
                            <p>Members: {squadMembers.map((m: any) => m?.name).filter(Boolean).join(", ") || "Not available"}</p>
                            {String(booking?.squadDetails?.console_group || "").toLowerCase() === "pc" ? (
                              <p>
                                Assigned Consoles: {
                                  assignedConsoleLabels.length > 0
                                    ? assignedConsoleLabels.join(", ")
                                    : (assignedConsoleIds.length > 0 ? assignedConsoleIds.join(", ") : "Not assigned yet")
                                }
                              </p>
                            ) : (
                              <p>Extra Controllers: {appliedControllerQty}</p>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasMeals) handleFoodIconClick(booking.bookingId, booking.username || 'Guest User', true);
                              else handleAddFoodClick(booking.bookingId, booking.username || 'Guest User');
                            }}
                            className="mr-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title={hasMeals ? "View meals & add more" : "Add meals to this booking"}
                          >
                            {hasMeals ? <UtensilsCrossed className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {hasMeals ? "Meals" : "Meal"}
                          </button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => start(booking)}
                            className={`inline-flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md !px-2.5 !py-0 text-xs font-semibold transition-all sm:min-w-[104px] sm:text-xs ${
                              canStartNow
                                ? "dashboard-btn-primary"
                                : "border border-border bg-transparent text-muted-foreground"
                            }`}
                            title={canStartNow ? "Start session" : "Start available 5 minutes before scheduled time"}
                          >
                            <Play className="h-3 w-3 shrink-0" />
                            <span className="truncate">Start</span>
                          </motion.button>
                          {canNoShow && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNoShowDialog(booking);
                              }}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-[86px] sm:min-w-[92px]")}
                            >
                              No Show
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog(booking, isPaidBooking || paymentBadgeLabel === "Part paid");
                              }}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-[86px] text-red-400 hover:text-red-300 sm:min-w-[92px]")}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {contactOverlay.open && contactOverlay.booking && (
        <BookingQuickView
          open
          onClose={() => setContactOverlay({ open: false, booking: null })}
          userId={contactOverlay.booking.userId || contactOverlay.booking.user_id}
          booking={{
            bookingId: contactOverlay.booking.bookingId,
            name: contactOverlay.booking.username || "Guest User",
            phone: getBookingPhone(contactOverlay.booking) || null,
            email: getBookingEmail(contactOverlay.booking) || null,
            console: contactOverlay.booking.consoleType || null,
            when: [contactOverlay.booking.date, contactOverlay.booking.time ? showRange(contactOverlay.booking.time) : null].filter(Boolean).join(" · ") || null,
            status: contactOverlay.booking.status || null,
          }}
        >
          <UpcomingSlotManager booking={contactOverlay.booking} vendorId={String(vendorId)} onChanged={() => {
            setRefreshSlots(prev => !prev)
            window.dispatchEvent(new CustomEvent('refresh-dashboard'))
          }} onRemove={(slotBooking) => {
            setContactOverlay({ open: false, booking: null })
            openCancelDialog(slotBooking, paymentBadge(slotBooking) === "Paid")
          }} />
        </BookingQuickView>
      )}
      
      {/* ✅ FIXED: Render modal using Portal at document root level */}
      {isMounted && createPortal(
        <MealDetailsModal
          isOpen={mealDetailsModal.isOpen}
          onClose={closeMealDetailsModal}
          bookingId={mealDetailsModal.bookingId}
          customerName={mealDetailsModal.customerName}
          initialMode={mealDetailsModal.mode}
          hasExistingMeals={mealDetailsModal.hasExistingMeals}
          vendorId={vendorId}
        />,
        document.body
      )}

      {isMounted && cancelDialog.open && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Cancel Booking</h3>
              <button
                type="button"
                onClick={closeCancelDialog}
                className="rounded-full border border-border p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {cancelDialog.isPaid
                ? "This booking is paid. Choose how you will repay the user."
                : "This booking is unpaid. The slot will be released immediately."}
            </p>

            {cancelDialog.isPaid && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Repayment Method</label>
                <select
                  value={cancelDialog.repaymentType}
                  onChange={(e) =>
                    setCancelDialog(prev => ({
                      ...prev,
                      repaymentType: e.target.value as any
                    }))
                  }
                  className="w-full rounded-md border border-border bg-muted/70 px-3 py-2 text-xs text-foreground"
                >
                  <option value="refund">Refund to original payment</option>
                  <option value="credit">Credit to wallet/pass</option>
                  <option value="reschedule">Reschedule credit</option>
                </select>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
              <textarea
                rows={2}
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-md border border-border bg-muted/70 px-3 py-2 text-xs text-foreground"
                placeholder="Add a short reason..."
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelDialog}
                className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className={cn(buttonVariants({ variant: "soft-danger", size: "sm" }), "disabled:cursor-not-allowed")}
              >
                {cancelLoading ? "Cancelling…" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMounted && noShowDialog.open && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Mark Booking As No Show</h3>
              <button
                type="button"
                onClick={closeNoShowDialog}
                className="rounded-full border border-border p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This marks the booking as no-show, releases the slot, and updates settlement in real time.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
              <textarea
                rows={2}
                value={noShowDialog.reason}
                onChange={(e) => setNoShowDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-md border border-border bg-muted/70 px-3 py-2 text-xs text-foreground"
                placeholder="User did not arrive..."
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeNoShowDialog}
                className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleMarkNoShow}
                disabled={noShowLoading}
                className={cn(buttonVariants({ variant: "soft-warning", size: "sm" }), "disabled:cursor-not-allowed")}
              >
                {noShowLoading ? "Updating…" : "Confirm No Show"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
