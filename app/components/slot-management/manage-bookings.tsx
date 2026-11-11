"use client"
import { toast } from "sonner";
import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jwtDecode } from 'jwt-decode'
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { contiguousDeskSlots, coveringDeskSlots } from "@/lib/desk-time-range"
import { DeskConsolePicker } from "../desk-console-picker"
import { deskSubtotal, rateLabel, resolveSessionRate, useDeskCards } from "../desk-rate-card"
import { creditAuthHeaders } from "@/lib/credit-auth"
import { useAccess } from "@/app/context/AccessContext"
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card"
import { 
  MoreVertical, 
  Plus, 
  Monitor, 
  MonitorPlay,
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  Wallet,
  CheckCircle,
  Loader2,
  Tv,
  Gamepad,
  Gamepad2,
  Headset,
  Joystick,
  Rocket,
  CalendarDays,
  Users,
  Sparkles,
  Ticket,
  AlertCircle,
  Clock,
  SlidersHorizontal
} from "lucide-react"
import { BOOKING_URL, DASHBOARD_URL } from '@/src/config/env'
import { ConsoleType } from '../types'
import MealSelector from '../mealSelector'
import BookingRecords from "../booking-records"
import scheduleStyles from "../schedule-workspace.module.css"
import CreditAccountModal, { type MonthlyCreditAccountSummary } from '../credit-account-modal'
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, CalendarClock, XCircle, ListTodo } from "lucide-react"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { useApiClient } from "@/app/hooks/useApiClient"
import { httpJson, clearHttpClientCache } from "@/lib/http-client"
import { getBookingSettings } from "@/lib/booking-settings"
import {
  normalizeConsoleSlug as normalizeCatalogSlug,
  resolveConsoleColor as resolveCatalogColor,
  resolveConsoleIcon as resolveCatalogIcon,
  type ConsoleCatalogItem,
} from "../console-catalog"
import { decodeVendorIdFromStorage, getISTMonthStartCompact } from "./shared"

export function ChangeBookingForm() {
  const api = useApiClient()
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState<any>(null);

  useEffect(() => {
    setVendorId(decodeVendorIdFromStorage());
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const data = await api.get<any>(`${BOOKING_URL}/api/bookings/${bookingId}`, {
        timeoutMs: 10_000,
        retries: 1,
      });

      if (data.success && data.booking) {
        setIsSubmitted(false);
        const { booking } = data;
        setBookingData({
          customer: booking.customer || { name: "", email: "", phone: "" },
          booking_date: booking.date || "",
          selected_slots: [`${booking.time_slot.start_time}`],
          system: booking.system || "",
          vendorId: vendorId,
          consoleTypeId: booking.game_id,
        });

        setBookingFound(true);
        await fetchAvailableSlots(1, booking.game_id, booking.date);
      } else {
        setBookingFound(false);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Couldn't look up that booking. Check your connection and try again.");
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async (vendorId: any, consoleTypeId: any, date: any) => {
    try {
      const data = await api.get<any>(
        `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${consoleTypeId}/${date.replaceAll("-", "")}`,
        { timeoutMs: 10_000, retries: 1 }
      );

      if (data.slots) {
        setAvailableSlots(data.slots);
      }
    } catch (error) {
      console.error("Error fetching available slots:", error);
    }
  };

  const handleUpdateBooking = async (e: any) => {
    e.preventDefault();
    setIsUpdating(true);
    if (!bookingData) return;

    try {
      const result = await api.put<any, string>(
        `${BOOKING_URL}/api/update_booking/${bookingId}`,
        JSON.stringify(bookingData),
        {
          headers: { "Content-Type": "application/json" },
          timeoutMs: 12_000,
          retries: 0,
        }
      );
      if (result?.success !== false) {
        setIsSubmitted(true);
      } else {
        toast.error("Failed to update booking.");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Couldn't update the booking. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-3">
      <form className="space-y-3">
        {/* Search Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">Search Booking</h3>
          <div className="flex space-x-2">
            <input
              id="bookingId"
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white"
            />

            <Button variant="success"
              type="button"
              onClick={handleSearch}
              disabled={isLoading} className="min-w-[100px]">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Booking Details */}
        {bookingFound && bookingData && !isSubmitted ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">
              Gamer's Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
                <input
                  value={bookingData.customer?.name || ""}
                  onChange={(e) =>
                    setBookingData((prev: any) => ({
                      ...prev,
                      customer: { ...prev.customer, name: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
                <input
                  type="email"
                  value={bookingData.customer?.email || ""}
                  onChange={(e) =>
                    setBookingData((prev: any) => ({
                      ...prev,
                      customer: { ...prev.customer, email: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone Number</label>
                <input
                  type="tel"
                  value={bookingData.customer?.phone || ""}
                  onChange={(e) =>
                    setBookingData((prev: any) => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">
              Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Booking Date</label>
                <input
                  type="date"
                  value={bookingData.booking_date || ""}
                  onChange={(e) =>
                    setBookingData((prev: any) => ({
                      ...prev,
                      booking_date: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Slot Time</label>
                <div className="grid grid-cols-6 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.slot_id}
                      type="button"
                      variant="outline"
                      disabled={!slot.is_available}
                      className={`rounded-full text-xs ${
                        bookingData.selected_slots.includes(slot.start_time)
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : ""
                      }`}
                      onClick={() =>
                        setBookingData((prev: any) => ({
                          ...prev,
                          selected_slots: [slot.start_time],
                        }))
                      }
                    >
                      {slot.start_time}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button variant="success" 
              onClick={handleUpdateBooking} 
              disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          </div>
        ) : null}

        {/* Success Message */}
        {isSubmitted && (
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              Booking has been successfully updated.
            </AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}
// ==================== REJECT BOOKING FORM ====================
export function RejectBookingForm() {
  const api = useApiClient()
  const [bookingId, setBookingId] = useState("");
  const [bookingFound, setBookingFound] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [bookingData, setBookingData] = useState<any>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [isConfirmingRejection, setIsConfirmingRejection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState<any>(null);

  useEffect(() => {
    setVendorId(decodeVendorIdFromStorage());
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const data = await api.get<any>(`${BOOKING_URL}/api/bookings/${bookingId}`, {
        timeoutMs: 10_000,
        retries: 1,
      });

      if (data.success && data.booking) {
        setIsSubmitted(false);
        const { booking } = data;
        setBookingData({
          customer: booking.customer || { name: "", email: "", phone: "" },
          booking_date: booking.date || "",
          booking_id: booking.booking_id,
          selected_slots: [`${booking.time_slot.start_time}`],
          system: booking.system || "",
          vendorId: vendorId,
          consoleTypeId: booking.game_id,
          start_time: booking.time_slot.start_time,
          end_time: booking.time_slot.end_time,
          amount_paid: booking.amount_paid,
        });
        setUserEmail(booking.customer?.email || "");
        setBookingFound(true);
      } else {
        setBookingFound(false);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Couldn't look up that booking. Check your connection and try again.");
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!confirmReject) {
      setConfirmReject(true);
      return;
    }

    setIsConfirmingRejection(true);
    setIsLoading(true);

    try {
      const response = await api.post<any, string>(
        `${BOOKING_URL}/api/bookings/reject`,
        JSON.stringify({
          booking_id: bookingId,
          rejection_reason: rejectionReason,
          repayment_type: repaymentType,
          user_email: userEmail,
        }),
        {
          headers: creditAuthHeaders(),
          timeoutMs: 12_000,
          retries: 0,
        }
      );

      if (response?.success !== false) {
        setIsSubmitted(true);
      } else {
        console.error("Error rejecting booking");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Couldn't complete that action. Please try again.");
    } finally {
      setIsConfirmingRejection(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">Search Booking</h3>
          <div className="flex space-x-2">
            <input
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="flex-1 px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white"
            />
            <Button variant="success"
              type="button"
              onClick={handleSearch}
              disabled={isLoading} className="min-w-[100px]">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {isSubmitted ? (
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              Booking has been successfully rejected.
            </AlertDescription>
          </Alert>
        ) : (
          <AnimatePresence>
            {bookingFound && bookingData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">
                    Booking Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card className="bg-zinc-50 dark:bg-zinc-700/30 p-3">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Booking ID</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.booking_id || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Date</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.booking_date || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Time Slot</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.start_time || ""} - {bookingData.end_time || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">System</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.system || ""}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-zinc-50 dark:bg-zinc-700/30 p-3">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Customer</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.customer?.name || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Email</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.customer?.email || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Phone</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            {bookingData.customer?.phone || ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Amount Paid</span>
                          <span className="font-medium text-zinc-800 dark:text-white">
                            ₹{bookingData.amount_paid || ""}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">
                    Rejection Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Reason for Rejection
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting this booking..."
                        className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-white resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Repayment Method
                      </label>
                      <Select value={repaymentType} onValueChange={setRepaymentType}>
                        <SelectTrigger className="bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600">
                          <SelectValue placeholder="Select repayment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refund">
                            Full Refund to Original Payment Method
                          </SelectItem>
                          <SelectItem value="credit">Store Credit</SelectItem>
                          <SelectItem value="reschedule">
                            Reschedule to Another Date
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {confirmReject ? (
                  <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        Are you sure you want to reject this booking? This action cannot be undone.
                      </span>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmReject(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={isConfirmingRejection || isLoading}
                        >
                          {isConfirmingRejection || isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            "Confirm Rejection"
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                    disabled={!rejectionReason || !repaymentType}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Booking
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </form>
    </div>
  );
}
// ==================== LIST BOOKING COMPONENT ====================
export function ListBooking() {
  const api = useApiClient()
  interface BookingType {
    id: string;
    bookingDate: string;
    bookingTime: string;
    username: string;
    consoleType: string;
    bookedDate: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    type: string;
  }

  const [vendorId, setVendorId] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<any>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, any>>({});

  const toggleDate = (date: any) => {
    setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const groupedBookings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredBookings.forEach((booking: any) => {
      const bookedDate = booking.bookedDate;
      if (!groups[bookedDate]) {
        groups[bookedDate] = [];
      }
      groups[bookedDate].push(booking);
    });
    return groups;
  }, [filteredBookings]);

  useEffect(() => {
    setVendorId(decodeVendorIdFromStorage());
  }, []);

  const fetchData = async () => {
    try {
      const formattedDate = getISTMonthStartCompact();
      const rows = await api.get<any[]>(
        `${BOOKING_URL}/api/getAllBooking/vendor/${vendorId}/${formattedDate}/`,
        { headers: { "Content-Type": "application/json" }, timeoutMs: 12_000, retries: 1 }
      );

      const mappedBookings = (Array.isArray(rows) ? rows : []).map((booking) => ({
        id: booking.bookingId.toString(),
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        username: booking.userName,
        consoleType: booking.consoleType,
        bookedDate: booking.bookedDate,
        startTime: booking.startTime || null,
        endTime: booking.endTime || null,
        status: booking.status,
        type: booking.type,
      }));

      setBookings(mappedBookings);
      setFilteredBookings(mappedBookings);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    fetchData();
  }, [vendorId]);

  useEffect(() => {
    if (!sortConfig) return;
    const sorted = [...filteredBookings].sort((a, b) => {
      if (sortConfig.key === "bookingDate") {
        const dateA = new Date(a.bookingDate);
        const dateB = new Date(b.bookingDate);
        return sortConfig.direction === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } else {
        const valueA = a[sortConfig.key]?.toString().toLowerCase() || "";
        const valueB = b[sortConfig.key]?.toString().toLowerCase() || "";
        if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }
    });
    setFilteredBookings(sorted);
  }, [sortConfig]);

  const handleSort = (key: any) => {
    setSortConfig((prev: any) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings);
    } else {
      const lower = searchQuery.toLowerCase();
      const results = bookings.filter((booking) =>
        Object.values(booking).some((value: any) => String(value ?? "").toLowerCase().includes(lower))
      );
      setFilteredBookings(results);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const getStatusBadge = (status: any) => {
    const variants: Record<string, string> = {
      rejected: "border border-red-400/40 bg-red-500/15 text-red-200",
      confirmed: "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    };
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          variants[status] || "border border-zinc-500/50 bg-zinc-700/60 text-zinc-200"
        }`}
      >
        {status}
      </span>
    );
  };

  const formatTime = (time: any) => {
    if (typeof time === "number") {
      const date = new Date(time);
      return `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full flex-1 rounded-lg border border-zinc-600/70 bg-zinc-800/70 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-400 focus:border-blue-400/60 focus:outline-none"
        />
        <Button onClick={handleSearch} className="ui-action-primary">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/60">
        <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-zinc-800/80">
              {[
                { label: "Booked Date", key: "bookedDate" },
                { label: "Username", key: "username" },
                { label: "Status", key: "status" },
                { label: "Booking ID", key: "id" },
                { label: "Booking Date", key: "bookingDate" },
                { label: "Booking Time", key: "bookingTime" },
                { label: "Console Type", key: "consoleType" },
                { label: "Start Time", key: "startTime" },
                { label: "End Time", key: "endTime" },
                { label: "Type", key: "type" },
              ].map(({ label, key }) => (
                <TableHead
                  key={key}
                  className="cursor-pointer font-semibold text-zinc-200 hover:bg-zinc-700/70 transition-colors"
                  onClick={() => handleSort(key)}
                >
                  {label}{" "}
                  {sortConfig?.key === key && (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedBookings).map(([bookedDate, bookings]) => (
              <React.Fragment key={bookedDate}>
                <TableRow
                  className="cursor-pointer bg-zinc-800/60 hover:bg-zinc-700/70"
                  onClick={() => toggleDate(bookedDate)}
                >
                  <TableCell colSpan={10} className="font-bold text-zinc-100">
                    {expandedDates[bookedDate] ? "▼" : "▶"}{" "}
                    {new Date(bookedDate).toDateString()} ({bookings.length})
                  </TableCell>
                </TableRow>

                {expandedDates[bookedDate] &&
                  bookings.map((booking: any, idx: any) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-zinc-800/60"
                    >
                      <TableCell className="text-zinc-200">{booking.bookedDate}</TableCell>
                      <TableCell className="text-zinc-200">{booking.username}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-zinc-300">{booking.id}</TableCell>
                      <TableCell className="text-zinc-300">{booking.bookingDate}</TableCell>
                      <TableCell className="text-zinc-300">{booking.bookingTime}</TableCell>
                      <TableCell className="text-zinc-300">{booking.consoleType}</TableCell>
                      <TableCell className="text-zinc-300">
                        {booking.startTime ? formatTime(booking.startTime) : "Not started"}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {booking.endTime ? formatTime(booking.endTime) : "Not ended"}
                      </TableCell>
                      <TableCell className="text-zinc-300">{booking.type}</TableCell>
                    </motion.tr>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
