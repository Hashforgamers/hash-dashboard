import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, Play, X, Gamepad2, Calendar, Clock, User, Search,
  DollarSign, CalendarDays, Users, Timer, AlertCircle, Filter, Phone,
  BadgeCheck, Calendar as CalendarIcon, ChevronDown, RefreshCw, UtensilsCrossed, Plus
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faIndianRupeeSign } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom"; // ✅ ADD THIS IMPORT
import axios from "axios";
import { format } from 'date-fns';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import ResponsiveSearchFilter from "./ResponsiveSearchFilter";
import MealDetailsModal from "./mealsDetailmodal";
import { useSocket } from "../context/SocketContext";


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

const TERMINAL_BOOKING_STATUSES = ["cancelled", "canceled", "rejected", "completed", "discarded", "no_show"];

const getBookingTimeRange = (booking: any) => {
  if (!booking?.date || !booking?.time) return null;
  const slotDate = parseBookingDateLocal(booking.date);
  if (!slotDate) return null;
  const [startRaw, endRaw] = String(booking.time).split(" - ");
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
  return now >= range.start && now <= range.end;
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
      const key = `${userId}_${gameId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {});

    Object.values(grouped).forEach((group: any) => {
      const sorted = (group as any[]).sort((a, b) => {
        const aStart = parseTime(a.time?.split(" - ")[0] || "");
        const bStart = parseTime(b.time?.split(" - ")[0] || "");
        return aStart.getTime() - bStart.getTime();
      });

      let current = { ...sorted[0] };
      let currentStart = parseTime(current.time?.split(" - ")[0] || "");
      let currentEnd = parseTime(current.time?.split(" - ")[1] || "");
      let mergedIds = [current.bookingId];
      let totalPrice = current.slot_price || 0;

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const nextStart = parseTime(next.time?.split(" - ")[0] || "");
        const nextEnd = parseTime(next.time?.split(" - ")[1] || "");

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
  setRefreshSlots: (prev: boolean) => void;
}


export function UpcomingBookings({
  upcomingBookings: initialBookings,
  vendorId,
  setRefreshSlots
}: UpcomingBookingsProps): JSX.Element {
  
  const { socket, isConnected, joinVendor } = useSocket()
  
  const [upcomingBookings, setUpcomingBookings] = useState(Array.isArray(initialBookings) ? initialBookings : [])

  // State for modal and console selection
  const [startCard, setStartCard] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState("");
  const [availableConsoles, setAvailableConsoles] = useState<any[]>([]);
  const [selectedConsole, setSelectedConsole] = useState<number | null>(null);
  const [selectedConsoleIds, setSelectedConsoleIds] = useState<number[]>([]);
  const [requiredConsoleCount, setRequiredConsoleCount] = useState<number>(1);
  const [isPcSquadStart, setIsPcSquadStart] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
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
    
    joinVendor(parseInt(vendorId))

    function handleUpcomingBooking(data: any) {
      console.log('📅 Real-time upcoming booking:', data)
      
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (!data || !eventVendorId) {
        console.warn('Invalid upcoming booking data:', data);
        return;
      }
      
      if (eventVendorId === parseInt(vendorId) && (data.status === 'Confirmed' || data.status === 'confirmed')) {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => booking?.bookingId === data.bookingId)
          if (!exists) {
            console.log('➕ Adding new booking immediately')
            return [data, ...prev]
          }
          return prev
        })
      }
    }

    function handleBookingUpdate(data: any) {
      console.log('🔄 Booking update:', data)
      
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (!data || !eventVendorId) {
        console.warn('Invalid booking update data:', data);
        return;
      }
      
      if (eventVendorId === parseInt(vendorId)) {
        const status = String(data.status || "").toLowerCase();
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          if ((data.status === 'Confirmed' || data.status === 'confirmed') && !prev.some(b => b?.bookingId === data.bookingId)) {
            return [data, ...prev]
          }

          const mapped = prev.map(booking => 
            booking?.bookingId === data.bookingId 
              ? { ...booking, ...data }
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
      if (eventVendorId === parseInt(vendorId)) {
        setUpcomingBookings(prev => {
          if (!Array.isArray(prev)) prev = [];
          
          const exists = prev.some(booking => booking?.bookingId === data.bookingId)
          if (!exists) {
            console.log('📅 ✅ Adding accepted booking to upcoming bookings immediately')
            return [data, ...prev]
          }
          return prev
        })
      }
    }

    function handleCurrentSlotStart(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      const vendorMatches = !data?.vendorId && !data?.vendor_id
        ? true
        : eventVendorId === parseInt(vendorId);
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
      if (eventVendorId && vendorId && eventVendorId !== parseInt(vendorId)) return;
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
        const timeOfDay = getTimeOfDay(booking.time?.split(" ")[0]);
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
  const start = (system: string, gameId: string, bookingId: string, booking: any) => {
    console.log('🚀 Start clicked with params:', { system, gameId, bookingId, vendorId });
    
    if (!system || !gameId || !bookingId) {
      console.error('❌ Missing required parameters:', { system, gameId, bookingId });
      return;
    }
    
    if (!vendorId) {
      console.error('❌ VendorId is not available');
      return;
    }
    
    setSelectedSystem(system);
    setSelectedGameId(gameId);
    setSelectedBookingId(bookingId);
    const consoleGroup = String(
      booking?.squadDetails?.console_group ||
      booking?.squadDetails?.consoleGroup ||
      (String(system || "").toLowerCase().includes("pc") ? "pc" : "")
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
    setSelectedConsole(null);
    setStartCard(true);
    fetchAvailableConsoles(gameId, vendorId);
  };

  // Enhanced fetch available consoles with comprehensive debugging
  const fetchAvailableConsoles = async (gameId: string, vendorId?: string) => {
    if (!vendorId) {
      console.error('❌ VendorId is missing for fetchAvailableConsoles');
      return;
    }
    
    console.log('🔍 Fetching consoles for gameId:', gameId, 'vendorId:', vendorId);
    
    setIsLoading(true);
    try {
      const apiUrl = `${DASHBOARD_URL}/api/getAllDevice/consoleTypeId/${gameId}/vendor/${vendorId}`;
      console.log('📡 API URL:', apiUrl);
      
      const response = await axios.get(apiUrl);
      console.log('📦 Raw API Response:', response.data);
      console.log('📦 Response type:', typeof response.data);
      console.log('📦 Is array:', Array.isArray(response.data));
      
      if (response.data && Array.isArray(response.data)) {
        console.log('🎮 All consoles before filtering:', response.data.map(c => ({
          id: c.consoleId,
          brand: c.brand,
          model: c.consoleModelNumber,
          available: c.is_available,
          status: c.status,
          raw: c
        })));
        
        console.log('🔍 Checking is_available values:', response.data.map(c => ({
          id: c.consoleId,
          is_available: c.is_available,
          type: typeof c.is_available,
          stringValue: String(c.is_available)
        })));
        
        const strictFilter = response.data.filter((console: any) => console?.is_available === true);
        const looseFilter = response.data.filter((console: any) => console?.is_available);
        const stringFilter = response.data.filter((console: any) => 
          String(console?.is_available).toLowerCase() === 'true'
        );
        
        console.log('✅ Strict filter (=== true):', strictFilter.length, 'consoles');
        console.log('✅ Loose filter (truthy):', looseFilter.length, 'consoles'); 
        console.log('✅ String filter ("true"):', stringFilter.length, 'consoles');
        
        let availableOnly = strictFilter;
        if (availableOnly.length === 0 && looseFilter.length > 0) {
          availableOnly = looseFilter;
          console.log('🔄 Using loose filter instead');
        }
        if (availableOnly.length === 0 && stringFilter.length > 0) {
          availableOnly = stringFilter;
          console.log('🔄 Using string filter instead');
        }
        
        console.log('✅ Final available consoles:', availableOnly.length);
        console.log('✅ Available console details:', availableOnly.map(c => ({
          id: c.consoleId,
          brand: c.brand,
          model: c.consoleModelNumber,
          available: c.is_available
        })));
        
        setAvailableConsoles(availableOnly);
      } else {
        console.warn('⚠️ API response is not an array or is empty:', response.data);
        setAvailableConsoles([]);
      }
    } catch (error) {
      console.error("❌ Error fetching available consoles:", error);
      if (axios.isAxiosError(error)) {
        console.error("📡 API Error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      setAvailableConsoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session start submission
  const handleSubmit = async () => {
    const effectiveSelected = selectedConsoleIds.length > 0
      ? selectedConsoleIds
      : (selectedConsole ? [selectedConsole] : []);
    if (effectiveSelected.length > 0 && selectedGameId && selectedBookingId) {
      setIsLoading(true);

      const selectedMergedBooking = mergedBookings.find(
        (booking) => booking.bookingId === selectedBookingId || booking.merged_booking_ids?.includes(selectedBookingId)
      );
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
          await axios.post(url, payload);
        } else {
          if (payload) {
            await axios.post(url, payload);
          } else {
            await axios.post(url);
          }
        }

        setStartCard(false);
        setRefreshSlots((prev) => !prev);
        
        setUpcomingBookings(prev => 
          Array.isArray(prev) ? prev.filter(booking => !bookingIds.includes(booking?.bookingId)) : []
        );
        
      } catch (error) {
        console.error("Error updating console status:", error);
      } finally {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refresh-dashboard"));
        }
        setIsLoading(false);
      }
    }
  };

  // Handle console selection
  const handleConsoleSelection = (consoleId: number) => {
    if (!isPcSquadStart) {
      setSelectedConsole(consoleId);
      setSelectedConsoleIds([consoleId]);
      return;
    }
    setSelectedConsoleIds((prev) => {
      if (prev.includes(consoleId)) {
        const next = prev.filter((id) => id !== consoleId);
        setSelectedConsole(next[0] || null);
        return next;
      }
      if (prev.length >= requiredConsoleCount) {
        return prev;
      }
      const next = [...prev, consoleId];
      setSelectedConsole(next[0] || null);
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
      const response = await fetch(`${BOOKING_URL}/api/bookings/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
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
      const response = await fetch(`${BOOKING_URL}/api/bookings/no-show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
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
      <div className="dashboard-module dashboard-module-panel h-full flex flex-col overflow-hidden rounded-2xl p-2 sm:p-3 lg:p-4">
        <AnimatePresence>
          {startCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent backdrop-blur-sm p-2 sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="w-full max-w-xs sm:max-w-md md:max-w-lg"
              >
                <Card className="bg-gray-50 dark:bg-zinc-900 overflow-hidden border border-gray-200 dark:border-zinc-800">
                  <div className="p-2 sm:p-3 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">
                        {isPcSquadStart ? `Select ${requiredConsoleCount} PC Consoles` : "Select Console"}
                      </h2>
                      <button
                        onClick={() => setStartCard(false)}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2 sm:p-3">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-24 sm:h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
                      </div>
                    ) : availableConsoles.length === 0 ? (
                      <div className="text-center py-6">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <h3 className="text-sm font-medium mb-1">No Consoles Available</h3>
                        <p className="text-gray-500 text-xs">All consoles are in use.</p>
                        <div className="mt-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-left">
                          <p>Debug Info:</p>
                          <p>GameId: {selectedGameId}</p>
                          <p>VendorId: {vendorId}</p>
                          <p>Check console for API response details</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableConsoles.map((console) => (
                          <motion.div
                            key={console.consoleId}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleConsoleSelection(console.consoleId)}
                            className={`cursor-pointer rounded-lg border ${
                              (isPcSquadStart
                                ? selectedConsoleIds.includes(console.consoleId)
                                : selectedConsole === console.consoleId)
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                : "border-gray-200 dark:border-zinc-800 hover:border-emerald-500/50"
                            } p-2 sm:p-3 transition-all duration-200`}
                          >
                            <div className="flex items-center space-x-2">
                              {getIcon(selectedSystem)}
                              <div>
                                <h3 className="text-sm font-medium">{console.brand}</h3>
                                <p className="text-xs text-gray-500">{console.consoleModelNumber}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmit}
                      disabled={
                        isLoading ||
                        (isPcSquadStart
                          ? selectedConsoleIds.length !== requiredConsoleCount
                          : !selectedConsole)
                      }
                      className={`w-full mt-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 ${
                        ((isPcSquadStart
                          ? selectedConsoleIds.length === requiredConsoleCount
                          : !!selectedConsole) && !isLoading)
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Start Session</span>
                        </>
                      )}
                    </motion.button>
                    {isPcSquadStart && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Selected {selectedConsoleIds.length}/{requiredConsoleCount} consoles.
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header + Search */}
        <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="dash-title">Upcoming Session Queue</h3>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-sm text-emerald-200">
              {filteredBookings.length}
            </span>
          </div>
          <ResponsiveSearchFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            className="w-full sm:w-[300px] lg:w-[330px]"
          />
        </div>

        {/* 🚀 FIXED: Scrollable content area that takes remaining space */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {mergedBookings.length === 0 ? (
            <div className="dashboard-module-empty h-full flex flex-col items-center justify-center py-6 px-3">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No bookings found</p>
              <p className="text-xs mt-1 text-center">
                {isConnected ? "Waiting for bookings..." : "Check filters"}
              </p>
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
                      className="dashboard-module-card rounded-lg p-2 transition-all duration-200 hover:border-emerald-300/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] sm:p-2.5"
                    >
                      <div className="space-y-1.5">
                        {/* Compact identity row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <User className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                              <span className="truncate dash-title !text-[12px] sm:!text-[13px]">
                                {booking.username || "Guest User"}
                              </span>
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
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <span className={`inline-flex h-7 items-center rounded-full border px-2 text-[11px] font-medium capitalize ${paymentBadgeClass}`}>
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
                                className="group inline-flex h-7 items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 transition-all duration-200 hover:bg-emerald-500/20"
                                title="View meals & add more"
                              >
                                <UtensilsCrossed className="h-3 w-3 text-emerald-300 transition-colors group-hover:text-emerald-200" />
                                <span className="hidden text-[10px] font-semibold text-emerald-200 sm:inline">Meals</span>
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddFoodClick(booking.bookingId, booking.username || 'Guest User');
                                }}
                                className="group inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-cyan-400/60 bg-cyan-500/10 px-2 transition-all duration-200 hover:bg-cyan-500/20"
                                title="Add meals to this booking"
                              >
                                <Plus className="h-3 w-3 text-cyan-300 transition-colors group-hover:text-cyan-200" />
                                <UtensilsCrossed className="h-3 w-3 text-cyan-300 transition-colors group-hover:text-cyan-200" />
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
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              start(booking.consoleType || "", booking.game_id, booking.bookingId, booking)
                            }
                            disabled={!canStartNow}
                            className={`inline-flex h-8 min-w-[96px] items-center justify-center gap-1 rounded-md !px-2.5 !py-0 text-[11px] font-semibold transition-all sm:min-w-[104px] sm:text-xs ${
                              canStartNow
                                ? "dashboard-btn-primary"
                                : "cursor-not-allowed bg-slate-700/70 text-slate-300"
                            }`}
                            title={canStartNow ? "Start session" : "Session can be started only during its scheduled time"}
                          >
                            <Play className="h-3 w-3 shrink-0" />
                            <span className="truncate">{canStartNow ? "Start" : "Not Startable"}</span>
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
