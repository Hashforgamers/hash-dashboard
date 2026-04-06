import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Gamepad2, Monitor, Headset, Loader2, RefreshCw, UtensilsCrossed, Plus, ChevronDown, ChevronUp, Phone, Mail } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { FaCheck, FaPowerOff } from 'react-icons/fa';
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";
import { mergeConsecutiveBookings } from "@/app/utils/slot-utils";
import HashLoader from './ui/HashLoader';
import ExtraBookingOverlay from "./extraBookingOverlay";
import MealDetailsModal from "./mealsDetailmodal";
import { useSocket } from "../context/SocketContext";

// Keep all your existing helper functions unchanged
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const IST_OFFSET_MINUTES = 330; // +05:30
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

const getIstDateKey = (dateInput: string): string | null => {
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

const parseTwelveHourTime = (timeInput: string) => {
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

const calculateElapsedTime = (startTime: string, date: string) => {
  if (!startTime) return 0;
  const dateKey = getIstDateKey(date);
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = parseTwelveHourTime(startTime);
  const startUtcMs = Date.UTC(year, month - 1, day, parsed.hours, parsed.minutes, 0) - IST_OFFSET_MS;
  return Math.max(Math.floor((Date.now() - startUtcMs) / 1000), 0);
};

const calculateExtraTime = (endTime: string, date: string) => {
  if (!endTime) return 0;
  const dateKey = getIstDateKey(date);
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = parseTwelveHourTime(endTime);
  const endUtcMs = Date.UTC(year, month - 1, day, parsed.hours, parsed.minutes, 0) - IST_OFFSET_MS;
  return Math.max(Math.floor((Date.now() - endUtcMs) / 1000), 0);
};

const calculateDuration = (startTime: string, endTime: string) => {
  if (!startTime || !endTime) return 0;
  const parseTimeToMinutes = (timeStr: string) => {
    const [time, modifier] = timeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  return (endMinutes - startMinutes) * 60;
};

const calculateExtraAmount = (extraSeconds: number, ratePerHour = 1) => {
  const extraHours = extraSeconds / 3600;
  return Math.ceil(extraHours * ratePerHour);
};

const formatHistoryDateLabel = (dateInput: any) => {
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

const normalizeHistoryStatus = (booking: any) => {
  const lifecycle = String(booking?.lifecycleStatus || "").toLowerCase().trim();
  if (lifecycle && !["upcoming", "current"].includes(lifecycle)) {
    return lifecycle;
  }
  const record = booking?.bookingRecordStatus;
  if (typeof record === "string") {
    const normalized = record.toLowerCase().trim();
    if (normalized && !["true", "false"].includes(normalized)) return normalized;
  }
  return "completed";
};

const historyStatusChipClass = (status: string) => {
  if (status === "rejected") return "border-red-400/40 bg-red-500/15 text-red-200";
  if (status === "discarded" || status === "no_show") {
    return "border-orange-400/40 bg-orange-500/15 text-orange-200";
  }
  if (status === "cancelled" || status === "canceled") {
    return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  }
  return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
};

const historyStatusLabel = (status: string) => {
  const value = String(status || "").toLowerCase().trim();
  if (value === "discarded" || value === "no_show") return "No Show";
  if (value === "verification_failed") return "Payment Failed";
  return value.replace("_", " ");
};

const getConsoleVisual = (consoleType: string) => {
  const value = String(consoleType || "").toLowerCase();
  if (value.includes("ps") || value.includes("playstation") || value.includes("sony")) {
    return { icon: Gamepad2, className: "text-blue-500" };
  }
  if (value.includes("xbox") || value.includes("microsoft")) {
    return { icon: Gamepad2, className: "text-green-500" };
  }
  if (value.includes("vr") || value.includes("virtual")) {
    return { icon: Headset, className: "text-fuchsia-400" };
  }
  if (value.includes("pc") || value.includes("computer") || value.includes("desktop")) {
    return { icon: Monitor, className: "text-cyan-400" };
  }
  return { icon: Monitor, className: "text-slate-300" };
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
    booking?.customerPhone ||
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

const releaseSlot = async (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any) => {
  try {
    console.log('🔄 Client: Calling release API for console:', consoleId);
    const response = await fetch(`${DASHBOARD_URL}/api/releaseDevice/consoleTypeId/${gameId}/console/${consoleId}/vendor/${vendorId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingStats: {} }),
    });
    if (response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.log('✅ Client: Release API call successful');
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

interface CurrentSlotsProps {
  currentSlots: any[];
  historyBookings?: any[];
  refreshSlots: boolean;
  setRefreshSlots: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function CurrentSlots({ currentSlots: initialSlots, historyBookings: initialHistoryBookings = [], refreshSlots, setRefreshSlots }: CurrentSlotsProps) {
  const { socket, isConnected, joinVendor } = useSocket()
  
  const [currentSlots, setCurrentSlots] = useState(initialSlots || [])
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSlots, setFilteredSlots] = useState(currentSlots);
  const [releasingSlots, setReleasingSlots] = useState<Record<string, boolean>>({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [timers, setTimers] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [historyDate, setHistoryDate] = useState<string>("");
  const [historyRows, setHistoryRows] = useState<any[]>(Array.isArray(initialHistoryBookings) ? initialHistoryBookings : []);
  const [historyLoading, setHistoryLoading] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  // ✅ ENHANCED: Updated meal details modal state with mode and meal status tracking
  const [mealDetailsModal, setMealDetailsModal] = useState({
    isOpen: false,
    bookingId: '',
    customerName: '',
    mode: 'view' as 'view' | 'add',
    hasExistingMeals: false,
    targetMember: null as null | {
      member_user_id?: number | null;
      member_position?: number;
      name?: string;
    }
  });

  // ✅ NEW: Track which bookings have meals locally for instant UI updates
  const [bookingMealStatus, setBookingMealStatus] = useState<Record<string, boolean>>({});
  const [bookingOutstandingDue, setBookingOutstandingDue] = useState<Record<string, number>>({});
  const [expandedLiveRows, setExpandedLiveRows] = useState<Record<string, boolean>>({});
  const [mealPickerBookingId, setMealPickerBookingId] = useState<string | null>(null);
  const [mealPickerMemberPosByBooking, setMealPickerMemberPosByBooking] = useState<Record<string, number>>({});
  const [contactOverlay, setContactOverlay] = useState<{
    open: boolean;
    booking: any | null;
  }>({
    open: false,
    booking: null,
  });

  // Get vendorId
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded_token.sub.id);
      } catch (error) {
        console.error("Error decoding token:", error);
        setError("Failed to authenticate user.");
      }
    } else {
      setError("No authentication token found.");
    }
  }, []);

  useEffect(() => {
    const todayIst = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    setHistoryDate(todayIst);
  }, []);

  // Update from props
  useEffect(() => {
    if (initialSlots && Array.isArray(initialSlots)) {
      setCurrentSlots(initialSlots)
      
      // ✅ Initialize meal status tracking
      const mealStatus: Record<string, boolean> = {};
      initialSlots.forEach(slot => {
        if (slot.bookingId || slot.bookId) {
          const bookingId = String(slot.bookingId || slot.bookId);
          mealStatus[bookingId] = Boolean(slot.hasMeals);
        }
      });
      setBookingMealStatus(mealStatus);
    }
  }, [initialSlots])

  useEffect(() => {
    if (Array.isArray(initialHistoryBookings)) {
      setHistoryRows(initialHistoryBookings);
    }
  }, [initialHistoryBookings]);

  useEffect(() => {
    const fetchHistoryByDate = async () => {
      if (activeTab !== "history" || !vendorId || !historyDate) return;
      setHistoryLoading(true);
      try {
        const res = await fetch(`${DASHBOARD_URL}/api/getLandingPage/vendor/${vendorId}?history_date=${historyDate}`);
        const data = await res.json();
        setHistoryRows(Array.isArray(data?.historyBookings) ? data.historyBookings : []);
      } catch (e) {
        setHistoryRows([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistoryByDate();
  }, [activeTab, vendorId, historyDate]);

  // ✅ ENHANCED: Listen for meal addition events to update UI immediately
  useEffect(() => {
    const handleMealAdded = (event: CustomEvent) => {
      const { bookingId } = event.detail || {};
      if (bookingId) {
        console.log('🍽️ Meal added event received for booking:', bookingId);
        setBookingMealStatus(prev => ({
          ...prev,
          [String(bookingId)]: true
        }));
        
        // Also update the currentSlots to reflect hasMeals = true
        setCurrentSlots(prev => 
          prev.map(slot => {
            const slotBookingId = String(slot.bookingId || slot.bookId || '');
            if (slotBookingId === String(bookingId)) {
              return { ...slot, hasMeals: true };
            }
            return slot;
          })
        );
      }
    };

    window.addEventListener('meal-added', handleMealAdded as EventListener);
    return () => {
      window.removeEventListener('meal-added', handleMealAdded as EventListener);
    };
  }, []);

  // Socket listeners (keep your existing working code)
  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return

    joinVendor(vendorId)

    function handleCurrentSlot(data: any) {
      const dataVendorId = parseInt(data.vendorId || data.vendor_id)
      const shouldProcess = dataVendorId === vendorId || !data.vendorId;
      
      if (shouldProcess) {
        const newSlot = {
          slotId: data.slotId,
          bookingId: data.bookId,
          username: data.username,
          customerPhone: data.customer_phone || data.phone || data.phone_number || data.user_phone || data.contact_number || "",
          consoleType: data.consoleType,
          consoleNumber: data.consoleNumber,
          consoleCode: data.consoleCode,
          consoleId: data.consoleId || data.console_id,
          game_id: data.game_id,
          startTime: data.startTime,
          endTime: data.endTime,
          date: data.date,
          status: 'active',
          slot_price: data.slot_price,
          userId: data.userId,
          hasMeals: data.hasMeals
        }
        
        setCurrentSlots(prevSlots => {
            const exists = prevSlots.some(slot => 
            slot.slotId === newSlot.slotId || 
            slot.bookingId === newSlot.bookingId ||
            (
              (slot.consoleId && newSlot.consoleId && Number(slot.consoleId) === Number(newSlot.consoleId)) ||
              (slot.consoleNumber === newSlot.consoleNumber && slot.status === 'active')
            )
          )
          
          if (!exists) {
            // ✅ Update meal status tracking for new slots
            const bookingId = String(newSlot.bookingId);
            setBookingMealStatus(prev => ({
              ...prev,
              [bookingId]: Boolean(newSlot.hasMeals)
            }));
            
            return [newSlot, ...prevSlots]
          } else {
            return prevSlots
          }
        })
      }
    }

    function handleConsoleAvailability(data: any) {
      const dataVendorId = parseInt(data.vendorId || data.vendor_id)
      if (dataVendorId === vendorId) {
        if (data.is_available === true) {
          setCurrentSlots(prevSlots => {
            const releasingSlot = prevSlots.find(
              (slot) =>
                Number(slot.consoleId || 0) === Number(data.console_id || 0) ||
                String(slot.consoleNumber || "") === String(data.console_id || "")
            )
            if (releasingSlot && typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("history-booking-add", {
                  detail: {
                    bookingId: releasingSlot.bookingId || releasingSlot.bookId,
                    username: releasingSlot.username,
                    customer_phone: getBookingPhone(releasingSlot),
                    customer_email: getBookingEmail(releasingSlot),
                    date: releasingSlot.date,
                    time: `${releasingSlot.startTime} - ${releasingSlot.endTime}`,
                    consoleName: releasingSlot.consoleType,
                    consoleType: releasingSlot.consoleType,
                    consoleNumber: releasingSlot.consoleNumber,
                    lifecycleStatus: "completed",
                    bookingRecordStatus: "completed",
                  },
                })
              );
            }

            const updated = prevSlots.filter(
              (slot) =>
                Number(slot.consoleId || 0) !== Number(data.console_id || 0) &&
                String(slot.consoleNumber || "") !== String(data.console_id || "")
            )
            return updated
          })
        } else {
          // Occupancy became active; refresh dashboard to pull latest live rows immediately.
          setRefreshSlots((prev: boolean) => !prev);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("refresh-dashboard"));
          }
        }
      }
    }

    socket.on('current_slot', handleCurrentSlot)
    socket.on('console_availability', handleConsoleAvailability)

    return () => {
      socket.off('current_slot', handleCurrentSlot)
      socket.off('console_availability', handleConsoleAvailability)
    }
  }, [socket, vendorId, isConnected, joinVendor])

  useEffect(() => {
    const handleHistoryAdd = (event: Event) => {
      const customEvent = event as CustomEvent;
      const payload = customEvent?.detail;
      if (!payload) return;
      setHistoryRows((prev) => {
        const rows = Array.isArray(prev) ? [...prev] : [];
        const bookingId = String(payload.bookingId || payload.booking_id || "");
        if (bookingId && rows.some((r: any) => String(r?.bookingId) === bookingId)) return rows;
        return [payload, ...rows];
      });
    };
    window.addEventListener("history-booking-add", handleHistoryAdd);
    return () => window.removeEventListener("history-booking-add", handleHistoryAdd);
  }, []);

  // Update filtered slots and timers
  useEffect(() => {
    const mergedSlots = mergeConsecutiveBookings(currentSlots);
    const filtered = searchQuery
      ? mergedSlots.filter(
          (slot) =>
            (slot.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (getBookingPhone(slot).toLowerCase()).includes(searchQuery.toLowerCase()) ||
            (slot.consoleType || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : mergedSlots;
    setFilteredSlots(filtered);

    const initialTimers = filtered.map((slot) => ({
      slotId: slot.slotId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: slot.date,
      elapsedTime: calculateElapsedTime(slot.startTime || '', slot.date || ''),
      extraTime: calculateExtraTime(slot.endTime || '', slot.date || ''),
      duration: calculateDuration(slot.startTime || '', slot.endTime || ''),
    }));
    setTimers(initialTimers);
  }, [currentSlots, searchQuery]);

  const filteredHistoryBookings = useMemo(() => {
    if (!Array.isArray(historyRows)) return [];
    const term = searchQuery.trim().toLowerCase();
    const rows = historyRows.filter((b: any) => {
      if (!term) return true;
      return (
        String(b?.username || "").toLowerCase().includes(term) ||
        getBookingPhone(b).toLowerCase().includes(term) ||
        String(b?.consoleName || b?.consoleType || "").toLowerCase().includes(term)
      );
    });
    return rows.sort((a: any, b: any) => {
      const da = new Date(`${a?.date || ""} ${(a?.time || "00:00").split(" - ")[0]}`);
      const db = new Date(`${b?.date || ""} ${(b?.time || "00:00").split(" - ")[0]}`);
      return db.getTime() - da.getTime();
    });
  }, [historyRows, searchQuery]);

  // Track outstanding dues per booking so under-time sessions with meal dues still require settlement.
  useEffect(() => {
    if (!Array.isArray(filteredSlots) || filteredSlots.length === 0) {
      setBookingOutstandingDue({});
      return;
    }

    const bookingIds = Array.from(
      new Set(
        filteredSlots
          .map((slot) => Number(slot.bookingId || slot.bookId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (bookingIds.length === 0) {
      setBookingOutstandingDue({});
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const token = localStorage.getItem("jwtToken");

    const fetchOutstanding = async () => {
      try {
        const results = await Promise.all(
          bookingIds.map(async (bookingId) => {
            try {
              const response = await fetch(`${BOOKING_URL}/api/booking/${bookingId}/payment-summary`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                signal: controller.signal,
              });
              if (!response.ok) return [String(bookingId), 0] as const;
              const data = await response.json();
              const due = Number(data?.payment_status?.amount_due ?? data?.financial_summary?.amount_due ?? 0);
              return [String(bookingId), Number.isFinite(due) ? due : 0] as const;
            } catch {
              return [String(bookingId), 0] as const;
            }
          })
        );

        if (isMounted) {
          setBookingOutstandingDue(Object.fromEntries(results));
        }
      } catch {
        if (isMounted) {
          setBookingOutstandingDue({});
        }
      }
    };

    fetchOutstanding();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filteredSlots, refreshSlots]);

  // Debug logging (unchanged)
  useEffect(() => {
    if (filteredSlots.length > 0) {
      const sampleSlot = filteredSlots[0];
      console.log('🔍 CurrentSlots sample booking structure:', {
        bookingId: sampleSlot.bookingId,
        bookId: sampleSlot.bookId,
        hasMeals: sampleSlot.hasMeals,
        username: sampleSlot.username
      });
    }
  }, [filteredSlots.length]);

  // Update timers every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimers((prevTimers) =>
        prevTimers.map((timer) => ({
          ...timer,
          elapsedTime: calculateElapsedTime(timer.startTime || '', timer.date || ''),
          extraTime: calculateExtraTime(timer.endTime || '', timer.date || ''),
        }))
      );
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle release slot with unique identifier
  const handleRelease = async (consoleType: string, gameId: string, consoleId: string, vendorId: any, setRefreshSlots: any, slotId: string, uniqueKey: string) => {
    setReleasingSlots((prev) => ({ ...prev, [uniqueKey]: true }));
    try {
      const releaseResult = await releaseSlot(consoleType, gameId, consoleId, vendorId, setRefreshSlots);
      if (releaseResult.ok) {
        if (!releaseResult.partial_release) {
          setCurrentSlots(prev => prev.filter(slot => slot.slotId !== slotId))
        }
      } else {
        setError("Failed to release slot. Please try again.");
      }
    } catch (error) {
      setError("Error releasing slot. Please try again.");
    } finally {
      setReleasingSlots((prev) => ({ ...prev, [uniqueKey]: false }));
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setError("");
  };

  // ✅ ENHANCED: Meal icon click handler for existing meals
  const handleMealIconClick = (
    bookingId: string,
    customerName: string,
    targetMember?: { member_user_id?: number | null; member_position?: number; name?: string } | null
  ) => {
    console.log('🍽️ CurrentSlots: Meal icon clicked', { 
      originalBookingId: bookingId, 
      customerName,
      isValidId: Boolean(bookingId && bookingId !== 'undefined')
    });

    if (!bookingId || bookingId === 'undefined') {
      console.error('❌ Invalid booking ID for meal details');
      setError('Cannot load meal details - invalid booking ID');
      return;
    }

    setMealDetailsModal({
      isOpen: true,
      bookingId: bookingId,
      customerName: customerName || 'Guest User',
      mode: 'view',
      hasExistingMeals: true,
      targetMember: targetMember || null
    });
  };

  // ✅ NEW: Add food click handler for bookings without meals
  const handleAddFoodClick = (
    bookingId: string,
    customerName: string,
    targetMember?: { member_user_id?: number | null; member_position?: number; name?: string } | null
  ) => {
    console.log('➕ CurrentSlots: Add food clicked', { 
      bookingId, 
      customerName,
      isValidId: Boolean(bookingId && bookingId !== 'undefined')
    });

    if (!bookingId || bookingId === 'undefined') {
      console.error('❌ Invalid booking ID for adding food');
      setError('Cannot add food - invalid booking ID');
      return;
    }

    setMealDetailsModal({
      isOpen: true,
      bookingId: bookingId,
      customerName: customerName || 'Guest User',
      mode: 'add',
      hasExistingMeals: false,
      targetMember: targetMember || null
    });
  };

  // ✅ ENHANCED: Modal close handler with meal status refresh
  const closeMealDetailsModal = () => {
    setMealDetailsModal({
      isOpen: false,
      bookingId: '',
      customerName: '',
      mode: 'view',
      hasExistingMeals: false,
      targetMember: null
    });
    
    // ✅ Emit event to refresh dashboard and update meal status
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="dashboard-module dashboard-module-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-2 sm:p-3 lg:p-4">
      {currentSlots?.available ? (
        <div className="flex h-full items-center justify-center">
          <HashLoader />
        </div>
      ) : (
        <>
          <div className="mb-3 flex shrink-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="dash-title">
                {activeTab === 'live'
                  ? `Live Console Sessions (${filteredSlots.length})`
                  : `Past Sessions (${filteredHistoryBookings.length})`}
              </span>
              <div className="dashboard-module-tab-group ml-2 flex items-center gap-1 rounded-md p-0.5">
                <button
                  onClick={() => setActiveTab('live')}
                  className={`rounded px-2.5 py-1 text-sm ${activeTab === 'live' ? 'dashboard-module-tab-active' : 'dashboard-module-tab'}`}
                >
                  Live
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`rounded px-2.5 py-1 text-sm ${activeTab === 'history' ? 'dashboard-module-tab-active' : 'dashboard-module-tab'}`}
                >
                  History
                </button>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className={`dashboard-module-input w-[132px] rounded-lg px-3 py-2 text-sm sm:w-44 ${
                  activeTab === "history" ? "opacity-100" : "hidden"
                }`}
              />
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:h-4 sm:w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search by name or console..."
                  className="dashboard-module-input w-full rounded-lg py-2.5 !pl-10 pr-3 text-sm sm:w-56 md:w-72"
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="dashboard-error-banner mb-2 shrink-0 text-xs sm:text-sm"
            >
              {error}
            </motion.div>
          )}

          {activeTab === 'live' ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="dashboard-table-shell flex-1 min-h-0 backdrop-blur-sm"
          >
            <div className="lg:hidden h-full overflow-y-auto p-2">
              {Array.isArray(filteredSlots) && filteredSlots.length > 0 ? (
                <div className="space-y-2">
                  {filteredSlots.map((booking) => {
                    const timer = timers.find((t) => t.slotId === booking.slotId) || {
                      elapsedTime: 0,
                      extraTime: 0,
                      duration: 3600,
                    };
                    const uniqueKey = `${booking.slotId}-${booking.bookingId || booking.bookId}-${booking.consoleId || booking.consoleNumber}`;
                    const isReleasing = releasingSlots[uniqueKey] || false;
                    const progress = Math.min(100, (timer.elapsedTime / timer.duration) * 100);
                    const hasExtraTime = timer.extraTime > 0;
                    const bookingIdToCheck = String(booking.bookingId || booking.bookId || "");
                    const outstandingDue = Number(bookingOutstandingDue[bookingIdToCheck] || 0);
                    const hasOutstandingDue = outstandingDue > 0.01;
                    const needsSettlement = hasExtraTime || hasOutstandingDue;
                    const remainingTime = Math.max((timer.duration || 0) - (timer.elapsedTime || 0), 0);
                    const hasMeals = bookingMealStatus[bookingIdToCheck] ?? booking.hasMeals ?? false;
                    const squadMembers = Array.isArray(booking?.squadMembers) ? booking.squadMembers : [];
                    const squadPlayerCount = Number(
                      booking?.squadPlayerCount ||
                      booking?.squadDetails?.player_count ||
                      (squadMembers.length || 1)
                    );
                    const squadEnabled = Boolean(booking?.squadEnabled || squadPlayerCount > 1);
                    const captainMember = squadMembers.find((member: any) => Boolean(member?.is_captain)) || squadMembers[0] || null;
                    const bookingPhone = getBookingPhone(booking);
                    return (
                      <motion.div
                        key={`live-mobile-${uniqueKey}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="dashboard-module-card rounded-xl p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setContactOverlay({ open: true, booking })}
                              className="truncate text-sm font-semibold text-slate-100 underline decoration-dotted underline-offset-2 hover:text-cyan-200 transition-colors"
                              title="View customer contact details"
                            >
                              {booking.username || "Guest"}
                            </button>
                            {bookingPhone && (
                              <p className="truncate text-xs text-slate-400">{bookingPhone}</p>
                            )}
                            <p className="truncate text-xs text-slate-400">
                              {booking.consoleType || "Gaming Console"} · {booking.startTime || "N/A"} - {booking.endTime || "N/A"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {squadEnabled && (
                              <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                                Squad x{squadPlayerCount}
                              </span>
                            )}
                            {hasMeals && (
                              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                Meals Added
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">Elapsed: {formatTime(timer.elapsedTime)}</span>
                            <span className={`${hasExtraTime ? "text-red-300" : "text-slate-400"}`}>
                              {hasExtraTime ? `Extended: ${formatTime(timer.extraTime)}` : `Remaining: ${formatTime(remainingTime)}`}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/90">
                            <motion.div
                              className={`h-full ${
                                hasExtraTime
                                  ? "bg-red-500"
                                  : progress < 75
                                    ? "bg-emerald-500"
                                    : progress < 90
                                      ? "bg-yellow-500"
                                      : "bg-orange-500"
                              }`}
                              style={{ width: `${progress}%` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                          {hasOutstandingDue && (
                            <p className="text-xs font-semibold text-amber-300">
                              To be paid: ₹{outstandingDue.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {hasMeals ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleMealIconClick(bookingIdToCheck, booking.username || "Guest User", captainMember ? {
                                  member_user_id: captainMember?.member_user_id ?? null,
                                  member_position: captainMember?.member_position,
                                  name: captainMember?.name || captainMember?.name_snapshot || undefined,
                                } : null)
                              }
                              className="rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-2 text-xs font-semibold text-emerald-200"
                            >
                              Meals
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddFoodClick(bookingIdToCheck, booking.username || "Guest User", captainMember ? {
                                  member_user_id: captainMember?.member_user_id ?? null,
                                  member_position: captainMember?.member_position,
                                  name: captainMember?.name || captainMember?.name_snapshot || undefined,
                                } : null)
                              }
                              className="rounded-md border border-cyan-400/50 bg-cyan-500/10 px-2.5 py-2 text-xs font-semibold text-cyan-200"
                            >
                              Add Meals
                            </button>
                          )}

                          {needsSettlement ? (
                            <button
                              onClick={() => {
                                setSelectedSlot(booking);
                                setShowOverlay(true);
                                setError("");
                              }}
                              className={`rounded-md px-2.5 py-2 text-xs font-semibold text-white ${
                                hasOutstandingDue && !hasExtraTime
                                  ? "bg-orange-500 hover:bg-orange-600"
                                  : "bg-yellow-500 hover:bg-yellow-600"
                              }`}
                            >
                              Settle
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRelease(
                                booking.consoleType || '',
                                booking.game_id || '',
                                String(booking.consoleId || booking.consoleNumber || ''),
                                vendorId,
                                setRefreshSlots,
                                booking.slotId,
                                uniqueKey
                              )}
                              disabled={isReleasing || !vendorId}
                              className="rounded-md bg-emerald-500 px-2.5 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
                            >
                              {isReleasing ? "Releasing..." : "Release"}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="dashboard-module-empty flex h-full flex-col items-center justify-center py-8">
                  <Search className="h-8 w-8 text-slate-600" />
                  <p className="text-sm font-medium">No active slots found</p>
                  <p className="text-xs">{isConnected ? "Waiting for new sessions..." : "Check connection"}</p>
                </div>
              )}
            </div>

            <div className="hidden h-full lg:block">
            <div className="dashboard-table-wrap h-full">
              <table ref={tableRef} className="dashboard-module-table min-w-[760px] max-md:min-w-[680px] w-full divide-y">
                <thead className="dashboard-module-table-head sticky top-0 z-10">
                  <tr>
                    {['Name', 'System', 'Time', 'Progress', 'Extra', 'Action'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="dashboard-module-table-header px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider md:px-4"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="dashboard-module-table-body divide-y">
                  {Array.isArray(filteredSlots) && filteredSlots.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {filteredSlots.map((booking, index) => {
                        const timer = timers.find((t) => t.slotId === booking.slotId) || {
                          elapsedTime: 0,
                          extraTime: 0,
                          duration: 3600,
                        };
                        
                        const uniqueKey = `${booking.slotId}-${booking.bookingId || booking.bookId}-${booking.consoleId || booking.consoleNumber}`;
                        const isReleasing = releasingSlots[uniqueKey] || false;
                        const progress = Math.min(100, (timer.elapsedTime / timer.duration) * 100);
                        const hasExtraTime = timer.extraTime > 0;
                        const bookingIdForDue = String(booking.bookingId || booking.bookId || "");
                        const outstandingDue = Number(bookingOutstandingDue[bookingIdForDue] || 0);
                        const hasOutstandingDue = outstandingDue > 0.01;
                        const needsSettlement = hasExtraTime || hasOutstandingDue;
                        const remainingTime = Math.max((timer.duration || 0) - (timer.elapsedTime || 0), 0);
                        const progressPercent = Number.isFinite(progress) ? Math.max(0, Math.round(progress)) : 0;
                        const progressState = hasExtraTime
                          ? "Overtime"
                          : progressPercent >= 90
                            ? "Ending Soon"
                            : progressPercent >= 60
                              ? "In Session"
                              : "Stable";

                        // ✅ ENHANCED: Check meal status from both original data and local tracking
                        const bookingIdToCheck = String(booking.bookingId || booking.bookId || '');
                        const hasMeals = bookingMealStatus[bookingIdToCheck] ?? booking.hasMeals ?? false;
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
                          .slice(0, 2);
                        const rowExpanded = Boolean(expandedLiveRows[bookingIdToCheck]);
                        const assignedConsoleLabels = Array.isArray(booking?.squadDetails?.assigned_console_labels)
                          ? booking.squadDetails.assigned_console_labels
                          : [];
                        const assignedConsoleIds = Array.isArray(booking?.squadDetails?.assigned_console_ids)
                          ? booking.squadDetails.assigned_console_ids
                          : [];
                        const memberConsoleMap = Array.isArray(booking?.squadDetails?.member_console_map)
                          ? booking.squadDetails.member_console_map
                          : [];
                        const isPcSquad = squadEnabled && String(booking?.squadDetails?.console_group || "").toLowerCase() === "pc";
                        const sortedSquadMembers = squadMembers
                          .slice()
                          .sort((a: any, b: any) => Number(a?.member_position || 0) - Number(b?.member_position || 0));
                        const captainMember = sortedSquadMembers.find((m: any) => Boolean(m?.is_captain)) || sortedSquadMembers[0] || null;
                        const selectedMealMemberPos = mealPickerMemberPosByBooking[bookingIdToCheck] ?? Number(captainMember?.member_position || 1);
                        const selectedMealMember = sortedSquadMembers.find((m: any) => Number(m?.member_position || 0) === Number(selectedMealMemberPos)) || captainMember;
                        const assignedLabelById = new Map<number, string>();
                        assignedConsoleIds.forEach((id: any, idx: number) => {
                          const parsedId = Number(id || 0);
                          const label = String(assignedConsoleLabels[idx] || "").trim();
                          if (parsedId > 0 && label) assignedLabelById.set(parsedId, label);
                        });
                        const pcMemberRows = isPcSquad
                          ? sortedSquadMembers.map((member: any, idx: number) => {
                              const memberPos = Number(member?.member_position || idx + 1);
                              const explicitMapping = memberConsoleMap.find((m: any) => Number(m?.member_position || 0) === memberPos);
                              const memberConsoleId = Number(
                                explicitMapping?.console_id ?? assignedConsoleIds[idx] ?? 0
                              ) || null;
                              const explicitLabel = String(explicitMapping?.console_label || "").trim();
                              const explicitLooksNumeric = /^[0-9]+$/.test(explicitLabel);
                              const preferredAssignedLabel = memberConsoleId ? assignedLabelById.get(memberConsoleId) : undefined;
                              const memberConsoleLabel = String(
                                preferredAssignedLabel ||
                                (!explicitLooksNumeric ? explicitLabel : "") ||
                                (memberConsoleId ? `Console-${memberConsoleId}` : "Unassigned")
                              );
                              const memberName = String(member?.name || `Player ${member?.member_position || idx + 1}`);
                              return {
                                member,
                                idx,
                                memberPos,
                                memberConsoleId,
                                memberConsoleLabel,
                                memberName,
                              };
                            })
                          : [];
                        const appliedControllerQty = Number(
                          booking?.squadDetails?.applied_extra_controller_qty ||
                          booking?.squadDetails?.suggested_extra_controller_qty ||
                          0
                        );
                        const bookingPhone = getBookingPhone(booking);

                        return (
                          <motion.tr
                            key={uniqueKey}
                            variants={item}
                            className="dashboard-module-row transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* ✅ ENHANCED: Name cell with dynamic meal/add food buttons */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300 sm:h-8 sm:w-8">
                                  {(booking.username || 'Guest').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <div className="truncate dash-title !text-sm">
                                      <button
                                        type="button"
                                        onClick={() => setContactOverlay({ open: true, booking })}
                                        className="truncate text-left underline decoration-dotted underline-offset-2 hover:text-cyan-200 transition-colors"
                                        title="View customer contact details"
                                      >
                                        {booking.username || 'Guest'}
                                      </button>
                                    </div>
                                    {squadEnabled && (
                                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                                        Captain
                                      </span>
                                    )}
                                    {squadEnabled && (
                                      <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-200">
                                        Squad x{squadPlayerCount}
                                      </span>
                                    )}
                                    {hasMeals && (
                                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                                        Meals Added
                                      </span>
                                    )}
                                  </div>
                                  {squadEnabled && squadMemberNames.length > 0 && (
                                    <div className="text-xs text-slate-400">
                                      {squadMemberNames.join(", ")}
                                      {squadPlayerCount - squadMemberNames.length > 0
                                        ? ` +${squadPlayerCount - squadMemberNames.length}`
                                        : ""}
                                    </div>
                                  )}
                                  {bookingPhone && (
                                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                                      <Phone className="h-3 w-3" />
                                      <span className="truncate">{bookingPhone}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* ✅ ENHANCED: Conditional rendering of meal/add food buttons */}
                                {hasMeals ? (
                                  // Show food icon for users who have meals
                                  <div className="relative">
                                    <motion.button
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPcSquad && sortedSquadMembers.length > 0) {
                                          setMealPickerBookingId((prev) => (prev === bookingIdToCheck ? null : bookingIdToCheck));
                                          setMealPickerMemberPosByBooking((prev) => ({
                                            ...prev,
                                            [bookingIdToCheck]: Number(prev[bookingIdToCheck] || captainMember?.member_position || 1),
                                          }));
                                          return;
                                        }
                                        handleMealIconClick(bookingIdToCheck, booking.username || 'Guest User');
                                      }}
                                      className="group flex flex-shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 p-1.5 transition-all duration-200 hover:bg-emerald-500/20"
                                      title="View meals & add more"
                                    >
                                      <UtensilsCrossed className="h-3 w-3 text-emerald-300 transition-colors group-hover:text-emerald-200 sm:h-4 sm:w-4" />
                                      <span className="hidden text-xs font-medium text-emerald-200 sm:inline">
                                        Meals
                                      </span>
                                    </motion.button>
                                    {isPcSquad && sortedSquadMembers.length > 0 && mealPickerBookingId === bookingIdToCheck && (
                                      <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-cyan-500/30 bg-slate-900/95 p-2 shadow-xl">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Add/View Meal For</div>
                                        <select
                                          value={String(selectedMealMemberPos || "")}
                                          onChange={(e) => {
                                            const value = Number(e.target.value || 0);
                                            setMealPickerMemberPosByBooking((prev) => ({ ...prev, [bookingIdToCheck]: value }));
                                          }}
                                          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                                        >
                                          {sortedSquadMembers.map((member: any, idx: number) => {
                                            const name = String(member?.name || `Player ${member?.member_position || idx + 1}`);
                                            const pos = Number(member?.member_position || idx + 1);
                                            return (
                                              <option key={`${bookingIdToCheck}-meal-member-opt-${idx}`} value={pos}>
                                                {name}{member?.is_captain ? " (Captain)" : ""}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        <div className="mt-2 flex gap-1">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMealIconClick(bookingIdToCheck, booking.username || 'Guest User', {
                                                member_user_id: selectedMealMember?.member_user_id ?? null,
                                                member_position: selectedMealMember?.member_position,
                                                name: selectedMealMember?.name || selectedMealMember?.name_snapshot || undefined,
                                              });
                                              setMealPickerBookingId(null);
                                            }}
                                            className="flex-1 rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200"
                                          >
                                            View
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddFoodClick(bookingIdToCheck, booking.username || 'Guest User', {
                                                member_user_id: selectedMealMember?.member_user_id ?? null,
                                                member_position: selectedMealMember?.member_position,
                                                name: selectedMealMember?.name || selectedMealMember?.name_snapshot || undefined,
                                              });
                                              setMealPickerBookingId(null);
                                            }}
                                            className="flex-1 rounded border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-xs text-cyan-200"
                                          >
                                            Add
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Show add food button for users who haven't ordered meals
                                  <div className="relative">
                                    <motion.button
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPcSquad && sortedSquadMembers.length > 0) {
                                          setMealPickerBookingId((prev) => (prev === bookingIdToCheck ? null : bookingIdToCheck));
                                          setMealPickerMemberPosByBooking((prev) => ({
                                            ...prev,
                                            [bookingIdToCheck]: Number(prev[bookingIdToCheck] || captainMember?.member_position || 1),
                                          }));
                                          return;
                                        }
                                        handleAddFoodClick(bookingIdToCheck, booking.username || 'Guest User');
                                      }}
                                      className="group flex flex-shrink-0 items-center gap-1 rounded-full border border-dashed border-cyan-400/60 bg-cyan-500/10 p-1 transition-all duration-200 hover:bg-cyan-500/20 sm:p-1.5"
                                      title="Add meals to this booking"
                                    >
                                      <Plus className="h-2.5 w-2.5 text-cyan-300 transition-colors group-hover:text-cyan-200 sm:h-3 sm:w-3" />
                                      <UtensilsCrossed className="h-2.5 w-2.5 text-cyan-300 transition-colors group-hover:text-cyan-200 sm:h-3 sm:w-3" />
                                      <span className="hidden text-xs font-medium text-cyan-200 sm:inline">
                                        Add
                                      </span>
                                    </motion.button>
                                    {isPcSquad && sortedSquadMembers.length > 0 && mealPickerBookingId === bookingIdToCheck && (
                                      <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-cyan-500/30 bg-slate-900/95 p-2 shadow-xl">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Add Meal For</div>
                                        <select
                                          value={String(selectedMealMemberPos || "")}
                                          onChange={(e) => {
                                            const value = Number(e.target.value || 0);
                                            setMealPickerMemberPosByBooking((prev) => ({ ...prev, [bookingIdToCheck]: value }));
                                          }}
                                          className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                                        >
                                          {sortedSquadMembers.map((member: any, idx: number) => {
                                            const name = String(member?.name || `Player ${member?.member_position || idx + 1}`);
                                            const pos = Number(member?.member_position || idx + 1);
                                            return (
                                              <option key={`${bookingIdToCheck}-meal-add-member-opt-${idx}`} value={pos}>
                                                {name}{member?.is_captain ? " (Captain)" : ""}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddFoodClick(bookingIdToCheck, booking.username || 'Guest User', {
                                              member_user_id: selectedMealMember?.member_user_id ?? null,
                                              member_position: selectedMealMember?.member_position,
                                              name: selectedMealMember?.name || selectedMealMember?.name_snapshot || undefined,
                                            });
                                            setMealPickerBookingId(null);
                                          }}
                                          className="mt-2 w-full rounded border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-xs text-cyan-200"
                                        >
                                          Continue
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* System cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="space-y-1">
                                {isPcSquad && pcMemberRows.length > 0 ? (
                                  <div className="space-y-1">
                                      {(rowExpanded ? pcMemberRows : pcMemberRows.slice(0, 1)).map((entry, idx) => (
                                        <div
                                          key={`${bookingIdToCheck}-sys-member-${entry.idx}`}
                                          className="flex items-center justify-between gap-2 text-xs sm:text-sm"
                                        >
                                          <div className={`truncate inline-flex items-center ${idx === 0 ? "text-slate-100" : "text-slate-300"}`}>
                                            {idx === 0 && (() => {
                                              const visual = getConsoleVisual(booking.consoleType || "");
                                              const Icon = visual.icon;
                                              return (
                                                <span className="mr-1 inline-flex items-center">
                                                  <Icon className={`mr-1 h-3 w-3 sm:h-4 sm:w-4 ${visual.className}`} />
                                                </span>
                                              );
                                            })()}
                                            {entry.memberConsoleLabel} ({entry.memberName})
                                          </div>
                                          {pcMemberRows.length > 1 && idx === 0 && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedLiveRows((prev) => ({
                                                  ...prev,
                                                  [bookingIdToCheck]: !rowExpanded,
                                                }));
                                              }}
                                              className="px-1 py-0.5 text-cyan-200 hover:text-cyan-100"
                                              title={rowExpanded ? "Show less" : "Show all"}
                                            >
                                              {rowExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                ) : squadEnabled ? (
                                  <div className="text-xs text-sky-200">Extra Controllers: {appliedControllerQty}</div>
                                ) : (
                                  <div className="flex items-center space-x-1 sm:space-x-2">
                                    {(() => {
                                      const visual = getConsoleVisual(booking.consoleType || "");
                                      const Icon = visual.icon;
                                      return (
                                        <Icon className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${visual.className}`} />
                                      );
                                    })()}
                                    <span className="truncate text-xs text-slate-100 sm:text-sm">
                                      {booking.consoleType || 'Gaming Console'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Time cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="text-xs space-y-0.5 sm:space-y-1">
                                <div className="truncate">
                                  <span className="hidden text-slate-400 sm:inline">Start:</span>
                                  <span className="text-slate-400 sm:hidden">S:</span>{' '}
                                  {booking.startTime || 'N/A'}
                                </div>
                                <div className="truncate">
                                  <span className="hidden text-slate-400 sm:inline">End:</span>
                                  <span className="text-slate-400 sm:hidden">E:</span>{' '}
                                  {booking.endTime || 'N/A'}
                                </div>
                              </div>
                            </td>

                            {/* Progress cell - enhanced */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-slate-100 sm:text-sm">
                                    {formatTime(timer.elapsedTime)}
                                  </div>
                                  <span
                                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${
                                      hasExtraTime
                                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                                        : progressPercent >= 90
                                          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    }`}
                                  >
                                    {progressPercent}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700/90 sm:w-28">
                                  <motion.div
                                    className={`h-full ${
                                      hasExtraTime
                                        ? "bg-red-500"
                                        : progress < 75
                                          ? "bg-emerald-500"
                                          : progress < 90
                                            ? "bg-yellow-500"
                                            : "bg-orange-500"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                                <div className={`text-xs ${hasExtraTime ? "text-red-300" : "text-slate-400"}`}>
                                  {hasExtraTime ? `Extended: ${formatTime(timer.extraTime)}` : `Remaining: ${formatTime(remainingTime)}`}
                                  <span className="ml-1 text-slate-500">({progressState})</span>
                                </div>
                              </div>
                            </td>

                            {/* Extra Time cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              <div className="flex flex-col gap-1">
                                {hasExtraTime ? (
                                  <div className="text-xs font-semibold text-red-400 sm:text-sm">
                                    {formatTime(timer.extraTime)}
                                  </div>
                                ) : (
                                  <span className="text-xs text-emerald-400 sm:text-sm">
                                    00:00:00
                                  </span>
                                )}
                                {hasOutstandingDue && (
                                  <span className="text-[11px] font-semibold text-amber-300 sm:text-xs">
                                    To be paid: ₹{outstandingDue.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Action cell - unchanged */}
                            <td className="px-3 py-3 md:px-4">
                              {isPcSquad ? (
                                <div className="flex flex-col gap-1">
                                  {needsSettlement && (
                                    <button
                                      onClick={() => {
                                        setSelectedSlot(booking);
                                        setShowOverlay(true);
                                        setError("");
                                      }}
                                      className={`w-20 rounded-md px-2 py-1 text-xs text-white transition-colors sm:w-24 ${
                                        hasOutstandingDue && !hasExtraTime
                                          ? "bg-orange-500 hover:bg-orange-600"
                                          : "bg-yellow-500 hover:bg-yellow-600"
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        <FaCheck className="w-2 h-2 sm:w-3 sm:h-3" />
                                        <span className="hidden sm:inline">Settle All</span>
                                        <span className="sm:hidden">Settle</span>
                                      </div>
                                    </button>
                                  )}
                                </div>
                              ) : needsSettlement ? (
                                <button
                                  onClick={() => {
                                    setSelectedSlot(booking);
                                    setShowOverlay(true);
                                    setError("");
                                  }}
                                  className={`w-20 rounded-md px-2 py-1 text-xs text-white transition-colors sm:w-24 ${
                                    hasOutstandingDue && !hasExtraTime
                                      ? "bg-orange-500 hover:bg-orange-600"
                                      : "bg-yellow-500 hover:bg-yellow-600"
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <FaCheck className="w-2 h-2 sm:w-3 sm:h-3" />
                                    <span className="hidden sm:inline">Settle</span>
                                    <span className="sm:hidden">Set</span>
                                  </div>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRelease(
                                    booking.consoleType || '', 
                                    booking.game_id || '', 
                                    String(booking.consoleId || booking.consoleNumber || ''), 
                                    vendorId, 
                                    setRefreshSlots, 
                                    booking.slotId, 
                                    uniqueKey
                                  )}
                                  disabled={isReleasing || !vendorId}
                                  className="w-20 rounded-md bg-emerald-500 px-2 py-1 text-xs text-white transition-colors hover:bg-emerald-400 disabled:opacity-50 sm:w-24"
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {isReleasing ? (
                                      <Loader2 className="animate-spin w-2 h-2 sm:w-3 sm:h-3" />
                                    ) : (
                                      <FaPowerOff className="w-2 h-2 sm:w-3 sm:h-3" />
                                    )}
                                    <span className="hidden sm:inline">{isReleasing ? "..." : "Release"}</span>
                                    <span className="sm:hidden">{isReleasing ? "..." : "Rel"}</span>
                                  </div>
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center space-y-2"
                        >
                          <Search className="h-7 w-7 text-slate-600 sm:h-8 sm:w-8" />
                          <p className="text-xs sm:text-sm font-medium">No active slots found</p>
                          <p className="text-xs">
                            {isConnected ? "Waiting for new sessions..." : "Check connection"}
                          </p>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </motion.div>
          ) : (
            <div className="dashboard-table-shell flex-1 min-h-0">
              {historyLoading ? (
                <div className="dashboard-module-empty flex h-full flex-col items-center justify-center">
                  <p className="text-sm font-medium">Loading history...</p>
                </div>
              ) : filteredHistoryBookings.length === 0 ? (
                <div className="dashboard-module-empty flex h-full flex-col items-center justify-center">
                  <p className="text-sm font-medium">No past sessions found</p>
                </div>
              ) : (
                <>
                <div className="lg:hidden h-full overflow-y-auto p-2">
                  <div className="space-y-2">
                    {filteredHistoryBookings.map((b: any, i: number) => {
                      const normalizedStatus = normalizeHistoryStatus(b);
                      const statusLabel = historyStatusLabel(normalizedStatus);
                      const systemText = `${b.consoleName || b.consoleType || "Console"}${b.consoleBrand ? ` • ${b.consoleBrand}` : ""}${b.consoleNumber ? ` • ${b.consoleNumber}` : ""}`;
                      const bookingPhone = getBookingPhone(b);
                      return (
                        <div
                          key={`history-mobile-${b.bookingId || i}-${b.date}`}
                          className="dashboard-module-card rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-100">{b.username || "Guest"}</p>
                              {bookingPhone && (
                                <p className="truncate text-xs text-slate-400">{bookingPhone}</p>
                              )}
                              <p className="truncate text-xs text-slate-300">{systemText}</p>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${historyStatusChipClass(normalizedStatus)}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-slate-400">
                            <p>Time: {b.time || "Time not available"}</p>
                            <p>Date: {formatHistoryDateLabel(b.date)}</p>
                            <p>Booking: {b.bookingId ? `#${b.bookingId}` : "-"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="hidden h-full lg:block">
                <div className="dashboard-table-wrap h-full">
                  <table className="dashboard-module-table w-full min-w-[760px] max-md:min-w-[680px] divide-y">
                    <thead className="dashboard-module-table-head sticky top-0 z-10">
                      <tr>
                        {["Name", "System", "Time", "Progress", "Extra", "Action"].map((heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className="dashboard-module-table-header px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider md:px-4"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="dashboard-module-table-body divide-y">
                      {filteredHistoryBookings.map((b: any, i: number) => {
                        const normalizedStatus = normalizeHistoryStatus(b);
                        const statusLabel = historyStatusLabel(normalizedStatus);
                        const systemText = `${b.consoleName || b.consoleType || "Console"}${b.consoleBrand ? ` • ${b.consoleBrand}` : ""}${b.consoleNumber ? ` • ${b.consoleNumber}` : ""}`;
                        const bookingPhone = getBookingPhone(b);
                        return (
                          <tr key={`${b.bookingId || i}-${b.date}`} className="dashboard-module-row transition-colors">
                            <td className="px-3 py-3 md:px-4">
                              <div className="text-sm font-semibold text-slate-100">{b.username || "Guest"}</div>
                              {bookingPhone && (
                                <div className="text-xs text-slate-400 inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{bookingPhone}</span>
                                </div>
                              )}
                              <div className="text-xs text-slate-400">{b.bookingId ? `#${b.bookingId}` : "-"}</div>
                            </td>
                            <td className="px-3 py-3 md:px-4 text-xs text-slate-100">{systemText}</td>
                            <td className="px-3 py-3 md:px-4 text-xs text-slate-300">{b.time || "Time not available"}</td>
                            <td className="px-3 py-3 md:px-4 text-xs text-slate-300">Ended</td>
                            <td className="px-3 py-3 md:px-4 text-xs text-slate-300">{formatHistoryDateLabel(b.date)}</td>
                            <td className="px-3 py-3 md:px-4">
                              <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${historyStatusChipClass(normalizedStatus)}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
                </>
              )}
            </div>
          )}
          
          {activeTab === 'live' && (
            <ExtraBookingOverlay
              showOverlay={showOverlay}
              setShowOverlay={setShowOverlay}
              selectedSlot={selectedSlot}
              vendorId={vendorId}
              setRefreshSlots={setRefreshSlots}
              setSelectedSlot={setSelectedSlot}
              calculateExtraTime={calculateExtraTime}
              calculateExtraAmount={calculateExtraAmount}
              formatTime={formatTime}
              releaseSlot={releaseSlot}
            />
          )}

          {contactOverlay.open && (
            <div
              className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setContactOverlay({ open: false, booking: null })}
            >
              <div
                className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-slate-950 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-cyan-200">Customer Contact</h3>
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
                      <p className="mt-1 inline-flex items-center gap-1 text-slate-100">
                        <Phone className="h-3 w-3" />
                        <span>{getBookingPhone(contactOverlay.booking) || "-"}</span>
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                      <p className="mt-1 flex min-w-0 items-start gap-1 text-slate-100">
                        <Mail className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="break-all">{getBookingEmail(contactOverlay.booking) || "-"}</span>
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">User ID</p>
                      <p className="mt-1 text-slate-100">
                        {contactOverlay.booking?.userId || contactOverlay.booking?.user_id || "-"}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Booking ID</p>
                      <p className="mt-1 text-slate-100">
                        {contactOverlay.booking?.bookingId || contactOverlay.booking?.bookId || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Session</p>
                    <p className="mt-1 text-slate-100">
                      {contactOverlay.booking?.consoleType || "Console"} • {contactOverlay.booking?.startTime || "N/A"} - {contactOverlay.booking?.endTime || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* ✅ ENHANCED: MealDetailsModal with updated props */}
          <MealDetailsModal
            isOpen={mealDetailsModal.isOpen}
            onClose={closeMealDetailsModal}
            bookingId={mealDetailsModal.bookingId}
            customerName={mealDetailsModal.customerName}
            initialMode={mealDetailsModal.mode}
            hasExistingMeals={mealDetailsModal.hasExistingMeals}
            targetMember={mealDetailsModal.targetMember}
            vendorId={String(vendorId || '')}
          />
        </>
      )}
    </div>
  );
}
