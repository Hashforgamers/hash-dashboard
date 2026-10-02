
import { creditAuthHeaders } from "@/lib/credit-auth"
import { SessionConsoleDialog, type SessionConsole } from "./session-console-dialog";
import UpcomingSlotManager from "./upcoming-slot-manager";
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


// Helper function for getting platform icons
export function getIcon(system?: string | null): JSX.Element {
  const sys = (system || "").toLowerCase();
  
  if (sys.includes("ps5")) return <Gamepad2 className="w-4 h-4 text-blue-500" />;
  if (sys.includes("xbox")) return <Gamepad2 className="w-4 h-4 text-green-500" />;
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


// Helper function for merging consecutive bookings
const mergeConsecutiveBookings = (bookings: any[]) => {
  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return [];
  }

  const byDate = bookings.reduce((acc: any, booking) => {
    const date = booking?.date || new Date().toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {});

  const parseTime = (time: string): Date => {
    if (!time || typeof time !== 'string') {
      console.warn('parseTime expected a string but received:', time);
      return new Date(1970, 0, 1, 0, 0);
    }

    const [timePart, period] = time.trim().split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return new Date(1970, 0, 1, hours, minutes);
  };

  const formatTimeRange = (start: Date, end: Date): string => {
    const to12Hour = (date: Date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${period}`;
    };
    return `${to12Hour(start)} - ${to12Hour(end)}`;
  };

  const mergedResults: any[] = [];

  Object.entries(byDate).forEach(([date, dateBookings]) => {
    const grouped = (dateBookings as any[]).reduce((acc: any, booking) => {
      const userId = booking?.userId || 'unknown';
      const gameId = booking?.game_id || 'unknown';
      // Separate codes represent separate kiosk redemptions; keep their cards separate.
      const accessCode = booking?.access_code || booking?.accessCode || booking?.bookingId;
      const key = `${userId}_${gameId}_${accessCode}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {});

    Object.values(grouped).forEach((group: any) => {
      const sorted = (group as any[]).sort((a, b) => {
        const [aStartRaw] = splitBookingTimeRange(a);
        const [bStartRaw] = splitBookingTimeRange(b);
        const aStart = parseTime(aStartRaw);
        const bStart = parseTime(bStartRaw);
        return aStart.getTime() - bStart.getTime();
      });

      let current = { ...sorted[0] };
      const [currentStartRaw, currentEndRaw] = splitBookingTimeRange(current);
      let currentStart = parseTime(currentStartRaw);
      let currentEnd = parseTime(currentEndRaw);
      let mergedIds = [current.bookingId];
      let totalPrice = current.slot_price || 0;

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const [nextStartRaw, nextEndRaw] = splitBookingTimeRange(next);
        const nextStart = parseTime(nextStartRaw);
        const nextEnd = parseTime(nextEndRaw);

        if (nextStart.getTime() <= currentEnd.getTime()) {
          currentEnd = new Date(Math.max(currentEnd.getTime(), nextEnd.getTime()));
          mergedIds.push(next.bookingId);
          totalPrice += next.slot_price || 0;
        } else {
          current.time = formatTimeRange(currentStart, currentEnd);
          current.merged_booking_ids = mergedIds;
          current.total_price = totalPrice;
          current.duration = mergedIds.length;
          mergedResults.push(current);

          current = { ...next };
          currentStart = nextStart;
          currentEnd = nextEnd;
          mergedIds = [next.bookingId];
          totalPrice = next.slot_price || 0;
        }
      }

      current.time = formatTimeRange(currentStart, currentEnd);
      current.merged_booking_ids = mergedIds;
      current.total_price = totalPrice;
      current.duration = mergedIds.length;
      mergedResults.push(current);
    });
  });

  return mergedResults.sort((a, b) => {
    const da = parseBookingDateLocal(a.date);
    const db = parseBookingDateLocal(b.date);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  });
};


// Component props interface
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
      type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
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
      console.log('📅 UpcomingBookings: Updating from props with', initialBookings.length, 'bookings')
      setUpcomingBookings(initialBookings)
    }
  }, [initialBookings])

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    console.log('📅 UpcomingBookings: Setting up socket listeners...')
    const parsedVendorId = Number(vendorId)
    if (!Number.isFinite(parsedVendorId)) return
    
    joinVendor(parsedVendorId)

    function handleUpcomingBooking(data: any) {
      console.log('📅 Real-time upcoming booking:', data)
      
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
            console.log('➕ Adding new booking immediately')
            return [{ ...normalizedIncoming, bookingId: incomingBookingId }, ...prev]
          }
          return prev
        })
      }
    }

    function handleBookingUpdate(data: any) {
      console.log('🔄 Booking update:', data)
      
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
      console.log('✅ Booking accepted from notification panel:', data)
      
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId === parsedVendorId) {
        const normalizedIncoming = withNormalizedBookingTime(data);
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => booking?.bookingId === data.bookingId)
          if (!exists) {
            console.log('📅 ✅ Adding accepted booking to upcoming bookings immediately')
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
      console.log('🧹 Cleaning up UpcomingBookings listeners')
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
      console.log('📊 Sample booking structure:', mergedBookings[0]);
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
      booking?.consoleType ||
      booking?.system ||
      booking?.game ||
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
    fetchAvailableConsoles(resolvedGameId, resolvedVendorId);
  };

  const fetchAvailableConsoles = async (gameId: string, resolvedVendorId?: string) => {
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
      setAvailableConsoles(Array.from(new Map(available.map((row) => [row.consoleId, row])).values()));
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
            headers: { "Content-Type": "application/json" },
            timeoutMs: 12_000,
            retries: 0,
          });
        } else {
          if (payload) {
            await api.post(url, JSON.stringify(payload), {
              headers: { "Content-Type": "application/json" },
              timeoutMs: 12_000,
              retries: 0,
            });
          } else {
            await api.post(url, undefined, { timeoutMs: 12_000, retries: 0 });
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
    console.log('🍽️ Food icon clicked:', { bookingId, customerName, hasMeals });
    
    setMealDetailsModal({
      isOpen: true,
      bookingId,
      customerName,
      mode: 'view',
      hasExistingMeals: hasMeals
    });
  };

  const handleAddFoodClick = (bookingId: string, customerName: string) => {
    console.log('➕ Add food clicked:', { bookingId, customerName });
    
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
            <div className="dashboard-module-empty h-full flex flex-col items-center justify-center py-6 px-3">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{searchTerm ? 'No matching bookings' : 'No upcoming bookings'}</p>
              <p className="text-xs mt-1 text-center">
                {searchTerm ? 'Try another customer or console.' : isConnected ? 'Your queue is up to date.' : 'Check connection and filters.'}
              </p>
              <a href="/booking" className="operations-empty-action">New booking</a>
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
                    const paymentUseCase = String(
                      booking?.squadDetails?.payment_use_case ||
                      booking?.squadDetails?.paymentUseCase ||
                      booking?.payment_use_case ||
                      ""
                    ).toLowerCase();
                    const hasMeals = Boolean(booking?.hasMeals);
                    const settlementStatus = String(
                      booking?.squadDetails?.settlement_status ||
                      booking?.squadDetails?.settlementStatus ||
                      booking?.settlement_status ||
                      ""
                    ).toLowerCase();
                    const isPayAtCafe = paymentUseCase === "pay_at_cafe" ||
                      ["pending", "unpaid", "due"].includes(settlementStatus);
                    const isPaidBooking = !isPayAtCafe;
                    const bookingRecordStatus = String(
                      booking?.bookingRecordStatus || booking?.status || ""
                    ).toLowerCase();
                    const lifecycleStatus = String(booking?.lifecycleStatus || "").toLowerCase();
                    const canCancel = !["current", "completed"].includes(lifecycleStatus) &&
                      !TERMINAL_BOOKING_STATUSES.includes(bookingRecordStatus);
                    const canNoShow = canCancel && canMarkNoShowNow(booking);
                    const paymentBadgeLabel = isPayAtCafe ? "To Be Paid" : "Paid";
                    const paymentBadgeClass = isPayAtCafe
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                      : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
                    const bookingPhone = getBookingPhone(booking);
                    const bookingEmail = getBookingEmail(booking);
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
                      className="dashboard-module-card rounded-lg p-2 transition-colors duration-200 hover:border-white/20 sm:p-2.5"
                    >
                      <div className="space-y-1.5">
                        {/* Compact identity row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <User className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContactOverlay({ open: true, booking });
                                }}
                                className="truncate dash-title !text-[12px] sm:!text-[13px] text-left underline decoration-dotted underline-offset-2 hover:text-cyan-200 transition-colors cursor-pointer"
                                title="View booking details and manage slots"
                              >
                                {booking.username || "Guest User"}
                              </button>
                              {squadEnabled && (
                                <span className="shrink-0 rounded-full border border-sky-400/40 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200">
                                  x{squadPlayerCount}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
                              <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate">{booking.time || "No time set"}</span>
                            </div>
                            {bookingPhone && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">{bookingPhone}</span>
                              </div>
                            )}
                            {bookingEmail && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">
                                <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">{bookingEmail}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex max-w-[48%] shrink-0 flex-wrap items-center justify-end gap-1 sm:max-w-none sm:flex-nowrap">
                            <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-medium capitalize sm:h-7 sm:text-[11px] ${paymentBadgeClass}`}>
                              {paymentBadgeLabel}
                            </span>

                            {booking.hasMeals ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFoodIconClick(booking.bookingId, booking.username || 'Guest User', true);
                                }}
                                className="group inline-flex h-6 items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 transition-all duration-200 hover:bg-emerald-500/20 sm:h-7"
                                title="View meals & add more"
                              >
                                <UtensilsCrossed className="h-3 w-3 text-emerald-300 transition-colors group-hover:text-emerald-200" />
                                <span className="text-[10px] font-semibold text-emerald-200">Meals</span>
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddFoodClick(booking.bookingId, booking.username || 'Guest User');
                                }}
                                className="group inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-cyan-400/60 bg-cyan-500/10 px-2 transition-all duration-200 hover:bg-cyan-500/20 sm:h-7"
                                title="Add meals to this booking"
                              >
                                <Plus className="h-3 w-3 text-cyan-300 transition-colors group-hover:text-cyan-200" />
                                <UtensilsCrossed className="h-3 w-3 text-cyan-300 transition-colors group-hover:text-cyan-200" />
                                <span className="text-[10px] font-semibold text-cyan-200">Add</span>
                              </motion.button>
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
                                className="rounded border border-slate-500/50 p-1 text-slate-200 transition-colors hover:bg-slate-700/30"
                                title={expanded ? "Collapse squad details" : "Expand squad details"}
                              >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/25 bg-cyan-500/5 px-2 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <KeyRound className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                            <span className="text-[11px] text-slate-300">Access code</span>
                            <span className="select-all font-mono text-sm font-semibold tracking-widest text-cyan-100">
                              {booking.access_code || booking.accessCode || "Unavailable"}
                            </span>
                          </div>
                          {(booking.access_code || booking.accessCode) && (
                            <button
                              type="button"
                              aria-label="Copy gamer access code"
                              title="Copy code to share with the gamer"
                              className="rounded p-1 text-cyan-300 hover:bg-cyan-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
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
                          <p className="truncate text-[11px] text-slate-300">
                            Members: {squadMemberNames.join(", ")}
                            {squadPlayerCount - squadMemberNames.length > 0
                              ? ` +${squadPlayerCount - squadMemberNames.length} more`
                              : ""}
                          </p>
                        )}
                        {squadEnabled && expanded && (
                          <div className="rounded-md border border-sky-400/25 bg-sky-500/10 p-1.5 text-[11px] text-sky-100">
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

                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => start(booking)}
                            className={`inline-flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md !px-2.5 !py-0 text-[11px] font-semibold transition-all sm:min-w-[104px] sm:text-xs ${
                              canStartNow
                                ? "dashboard-btn-primary"
                                : "bg-slate-700/70 text-slate-300"
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
                              className="inline-flex h-8 min-w-[86px] items-center justify-center rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 text-[11px] font-semibold text-amber-200 transition-all hover:bg-amber-500/20 sm:min-w-[92px] sm:text-xs"
                            >
                              No Show
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog(booking, isPaidBooking);
                              }}
                              className="inline-flex h-8 min-w-[86px] items-center justify-center rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 text-[11px] font-semibold text-rose-200 transition-all hover:bg-rose-500/20 sm:min-w-[92px] sm:text-xs"
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

      {isMounted && contactOverlay.open && createPortal(
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setContactOverlay({ open: false, booking: null })}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-cyan-500/30 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-cyan-200">Booking details</h3>
              <button
                type="button"
                onClick={() => setContactOverlay({ open: false, booking: null })}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm">
              <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 font-semibold text-slate-100">
                  {contactOverlay.booking?.username || "Guest User"}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="mt-1 text-slate-100">{getBookingPhone(contactOverlay.booking) || "-"}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 break-all text-slate-100">{getBookingEmail(contactOverlay.booking) || "-"}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">User ID</p>
                  <p className="mt-1 text-slate-100">{contactOverlay.booking?.userId || contactOverlay.booking?.user_id || "-"}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Booking ID</p>
                  <p className="mt-1 text-slate-100">{contactOverlay.booking?.bookingId || "-"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Session</p>
                <p className="mt-1 text-slate-100">
                  {contactOverlay.booking?.consoleType || "Console"} • {contactOverlay.booking?.time || "Time not set"}
                </p>
              </div>
              <UpcomingSlotManager booking={contactOverlay.booking} vendorId={String(vendorId)} onChanged={() => {
                setRefreshSlots(prev => !prev)
                window.dispatchEvent(new CustomEvent('refresh-dashboard'))
              }} onRemove={(slotBooking) => {
                setContactOverlay({ open: false, booking: null })
                const useCase = String(slotBooking.squadDetails?.payment_use_case || slotBooking.payment_use_case || '').toLowerCase()
                const settlement = String(slotBooking.squadDetails?.settlement_status || slotBooking.settlement_status || '').toLowerCase()
                openCancelDialog(slotBooking, useCase !== 'pay_at_cafe' && !['pending', 'unpaid', 'due'].includes(settlement))
              }} />
            </div>
          </div>
        </div>,
        document.body
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Cancel Booking</h3>
              <button
                type="button"
                onClick={closeCancelDialog}
                className="rounded-full border border-slate-600/60 p-1 text-slate-300 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {cancelDialog.isPaid
                ? "This booking is paid. Choose how you will repay the user."
                : "This booking is unpaid. The slot will be released immediately."}
            </p>

            {cancelDialog.isPaid && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-medium text-slate-300">Repayment Method</label>
                <select
                  value={cancelDialog.repaymentType}
                  onChange={(e) =>
                    setCancelDialog(prev => ({
                      ...prev,
                      repaymentType: e.target.value as any
                    }))
                  }
                  className="w-full rounded-md border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
                >
                  <option value="refund">Refund to original payment</option>
                  <option value="credit">Credit to wallet/pass</option>
                  <option value="reschedule">Reschedule credit</option>
                </select>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-slate-300">Reason (optional)</label>
              <textarea
                rows={2}
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-md border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
                placeholder="Add a short reason..."
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelDialog}
                className="rounded-md border border-slate-600/60 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="rounded-md border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMounted && noShowDialog.open && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Mark Booking As No Show</h3>
              <button
                type="button"
                onClick={closeNoShowDialog}
                className="rounded-full border border-slate-600/60 p-1 text-slate-300 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              This marks the booking as no-show, releases the slot, and updates settlement in real time.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-slate-300">Reason (optional)</label>
              <textarea
                rows={2}
                value={noShowDialog.reason}
                onChange={(e) => setNoShowDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-md border border-slate-600/60 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
                placeholder="User did not arrive..."
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeNoShowDialog}
                className="rounded-md border border-slate-600/60 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleMarkNoShow}
                disabled={noShowLoading}
                className="rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {noShowLoading ? "Updating..." : "Confirm No Show"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
