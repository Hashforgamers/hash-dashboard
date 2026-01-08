"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { jwtDecode } from "jwt-decode";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarPlus, Edit, XCircle, Search, NotepadText, Clock, AlertCircle, Calendar, Users, CreditCard, FileText, CalendarClock, ListTodo, type LucideIcon, Loader2, Lock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Action as SonnerAction } from "sonner";
import { error } from "console";
import axios from "axios";
import { BOOKING_URL } from "@/src/config/env";
import BookingSystem from "./BookingSystem";


const formSteps = [
  { id: 1, icon: Users, label: "Gamer Info" },
  { id: 2, icon: Calendar, label: "Schedule" },
  { id: 3, icon: FileText, label: "Console" },
  { id: 4, icon: CreditCard, label: "Payment" },
];

interface BookingAction {
  iconColor: string;
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: {
    light: string;
    dark: string;
    iconLight: string;
    iconDark: string;
  };
}

const actions: BookingAction[] = [
  {
    type: "create",
    label: "Create Booking",
    description: "Schedule a new appointment",
    icon: CalendarPlus,
    // <CHANGE> Updated to use consistent card styling
    color: "bg-card border-border", // Consistent card colors
    iconColor: "#2563eb", // Light blue for the icon
  },
  {
    type: "change",
    label: "Change Booking",
    description: "Modify existing appointments",
    icon: CalendarClock,
    // <CHANGE> Updated to use consistent card styling
    color: "bg-card border-border", // Consistent card colors
    iconColor: "#7c3aed", // Purple for the icon
  },
  {
    type: "reject",
    label: "Reject Booking",
    description: "Cancel or decline bookings",
    icon: XCircle,
    // <CHANGE> Updated to use consistent card styling
    color: "bg-card border-border", // Consistent card colors
    iconColor: "#ef4444", // Red for the icon
  },
  {
    type: "list",
    label: "List Bookings",
    description: "View all appointments",
    icon: ListTodo,
    // <CHANGE> Updated to use consistent card styling
    color: "bg-card border-border", // Consistent card colors
    iconColor: "#059669", // Green for the icon
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const formVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

export function ManageBooking() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const handleActionClick = (actionType: string) => {
    setSelectedAction(actionType === selectedAction ? null : actionType);
  };

  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount

  async function fetchGames() {
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`
      ); // Replace with the actual API URL
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const games = await response.json();
      console.log(games);
      return games;
    } catch (error) {
      console.error("Error fetching games:", error);
      return [];
    }
  }

  const [game, setGame] = useState<any>([]);

  useEffect(() => {
    async function getGames() {
      const data = await fetchGames();
      setGame(data);
    }
    getGames();
  }, [vendorId]);

  // console.log(game.games[0]);

  const renderForm = () => {
    switch (selectedAction) {
      case "create":
        return (
          // <GridConsole setSelectedAction={setSelectedAction} game={game} />
          <BookingSystem setSelectedAction={setSelectedAction} game={game}/>
        );
      case "change":
        return <ChangeBookingForm/>;
      case "reject":
        return <RejectBookingForm />;
      case "list":
        return <ListBooking />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {actions.map((action) => (
          <motion.div
            key={action.type}
            variants={item}
            onHoverStart={() => setHoveredAction(action.type)}
            onHoverEnd={() => setHoveredAction(null)}
          >
            <Card
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg rounded-lg ${
                action.color
              } ${
                selectedAction === action.type
                  ? "ring-2 ring-primary shadow-lg transform scale-[1.02]"
                  : "hover:scale-[1.02]"
              }`}
              onClick={() => handleActionClick(action.type)}
            >
              <CardContent className="relative flex flex-col items-center justify-center p-6 text-center">
                <div
                  className="p-3 rounded-full"
                  style={{
                    backgroundColor: action.iconColor + "1A", // Add transparency for the icon's background
                    color: action.iconColor, // Icon color
                  }}
                >
                  <action.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">
                  {action.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedAction && (
          <motion.div
            key={selectedAction}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-card rounded-lg shadow-lg p-6 border dark:border-gray-800"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background rounded-lg " />
            <div className="relative">{renderForm()}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ... existing code ...

function ChangeBookingForm() {
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); // Track submission status
  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount


  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/bookings/${bookingId}`
      );
      const data = await response.json();
      console.log("Fetched Booking Data:", data);

      if (response.ok && data.success && data.booking) {
        setIsSubmitted(false);
        const { booking } = data;
        setBookingData({
          customer: booking.customer || { name: "", email: "", phone: "" },
          booking_date: booking.date || "",
          selected_slots: [`${booking.time_slot.start_time}`], // Preselect slot
          system: booking.system || "",
          vendorId: vendorId, // Hardcoded vendor ID (Update dynamically if needed)
          consoleTypeId: booking.game_id, // Extract console type ID
        });

        setBookingFound(true);

        // Fetch available slots for the given date
        await fetchAvailableSlots(1, booking.game_id, booking.date);
      } else {
        setBookingFound(false);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async (vendorId, consoleTypeId, date) => {
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${consoleTypeId}/${date.replaceAll("-", "")}`
      );
      const data = await response.json();
      console.log("Fetched Slots Data:", data);

      if (response.ok && data.slots) {
        setAvailableSlots(data.slots);
      }
    } catch (error) {
      console.error("Error fetching available slots:", error);
    }
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    if (!bookingData) return;

    try {
      const response = await fetch(
        `${BOOKING_URL}/api/update_booking/${bookingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      const result = await response.json();
      console.log("Update Response:", result);
      if (response.ok) {
        setIsSubmitted(true); // Mark as submitted
      } else {
        alert("Failed to update booking.");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    }finally {
      setIsUpdating(false);
    }
  };

  return (
    <form className="space-y-8">
      {/* Search Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Search Booking</h3>
        <div className="flex space-x-2">
          <Input
            id="bookingId"
            placeholder="Enter Booking ID"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="transition-all duration-300 focus:ring-2 focus:ring-primary"
          />

          <Button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Search className="w-4 h-4" />
              </motion.div>
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
        <div className="space-y-8">
          <h3 className="text-lg font-semibold">Gamer's Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={bookingData.customer?.name || ""}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={bookingData.customer?.email || ""}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, email: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={bookingData.customer?.phone || ""}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, phone: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold">Booking Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking Date</Label>
              <Input
                id="bookingDate"
                type="date"
                value={bookingData.booking_date || ""}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    booking_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Slot Time</Label>
              <div className="grid grid-cols-6 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.slot_id}
                    variant="outline"
                    disabled={!slot.is_available}
                    className={`rounded-full ${
                      bookingData.selected_slots.includes(slot.start_time)
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }`}
                    onClick={() =>
                      setBookingData((prev) => ({
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

          <Button onClick={handleUpdateBooking} disabled={isUpdating}>
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

      {/* Success Message After Update */}
      {isSubmitted && (
        <p>Booking has been successfully updated.</p> // Show success message after submission
      )}
    </form>
  );
}


function RejectBookingForm() {
  const [bookingId, setBookingId] = useState("");
  const [bookingFound, setBookingFound] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [bookingData, setBookingData] = useState(null);
  const [message, setMessage] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [isConfirmingRejection, setIsConfirmingRejection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); // Track submission status
  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount

 
  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/bookings/${bookingId}`
      );
      const data = await response.json();
      console.log("Fetched Booking Data:", data);

      if (response.ok && data.success && data.booking) {
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
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!confirmReject) {
      // Show the confirmation step when first clicked
      setConfirmReject(true);
      return;
    }
  
    setIsConfirmingRejection(true); // This disables the button during submission
    setIsLoading(true); // Trigger loader state
    
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/bookings/reject`,
        {
          method: "POST", // Use POST instead of DELETE
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingId,
            rejection_reason: rejectionReason,
            repayment_type: repaymentType,
            user_email: userEmail,
          }),
        }
      );
      
      if (response.ok) {
        // Handle successful rejection here
        setIsSubmitted(true); // Mark as submitted
        console.log('Booking rejected');
      } else {
        // Handle error in rejection
        console.error('Error rejecting booking');
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsConfirmingRejection(false); // Reset after submission
      setIsLoading(false); // Reset loader state
    }
  };

  return (    
      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">Search Booking</h3>
          <div className="flex space-x-2">
            <div className="flex-grow">
              <Input
                id="bookingId"
                placeholder="Enter Booking ID"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="transition-all duration-300 focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="w-4 h-4" />
                </motion.div>
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
          <p>Booking has been successfully rejected.</p> // Show success message after submission
        ) : (
          <AnimatePresence>
            {bookingFound && bookingData &&(
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-primary">
                    Booking Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Booking ID
                            </span>
                            <span className="font-medium">{bookingData.booking_id || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-medium">{bookingData.booking_date || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time Slot</span>
                            <span className="font-medium">{bookingData.start_time || ""} - {bookingData.end_time || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">System</span>
                            <span className="font-medium">{bookingData.system || ""}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer</span>
                            <span className="font-medium">{bookingData.customer?.name || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-medium">{bookingData.customer?.email || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone</span>
                            <span className="font-medium">{bookingData.customer?.phone || ""}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Amount Paid
                            </span>
                            <span className="font-medium">${bookingData.amount_paid || ""}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-primary">
                    Rejection Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                      <Textarea
                        id="rejectionReason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting this booking..."
                        className="min-h-[100px] transition-all duration-300 focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="repaymentType">Repayment Method</Label>
                      <Select
                        value={repaymentType}
                        onValueChange={setRepaymentType}
                      >
                        <SelectTrigger
                          id="repaymentType"
                          className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                        >
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
                        Are you sure you want to reject this booking? This action cannot
                        be undone.
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
  );
}


function ListBooking() {
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

  const [vendorId, setVendorId] = useState<number | null>(null);
  const [bookings, setBookings] = useState<BookingType[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const groupedBookings = useMemo(() => {
    const groups: Record<string, BookingType[]> = {};
    filteredBookings.forEach(booking => {
      const bookedDate = booking.bookedDate;
      if (!groups[bookedDate]) {
        groups[bookedDate] = [];
      }
      groups[bookedDate].push(booking);
    });
    return groups;
  }, [filteredBookings]);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  const fetchData = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const formattedDate = startOfMonth.toISOString().slice(0, 10).replace(/-/g, "");
      const response = await axios.get(
        `${BOOKING_URL}/api/getAllBooking/vendor/${vendorId}/${formattedDate}/`,
        { headers: { "Content-Type": "application/json" } }
      );

      const mappedBookings = response.data.map((booking) => ({
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
      console.error("Error fetching data:", error.response ? error.response.data : error.message);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    fetchData();
  }, [vendorId]);

  const startTimer = (id: string) => {
    const update = (booking: BookingType) =>
      booking.id === id ? { ...booking, status: "In progress", startTime: Date.now() } : booking;

    setBookings(prev => prev.map(update));
    setFilteredBookings(prev => prev.map(update));
  };

  useEffect(() => {
    if (!sortConfig) return;
    const sorted = [...filteredBookings].sort((a, b) => {
      if (sortConfig.key === "bookingDate") {
        const dateA = new Date(a.bookingDate);
        const dateB = new Date(b.bookingDate);
        return sortConfig.direction === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      } else {
        const valueA = (a as any)[sortConfig.key]?.toString().toLowerCase() || "";
        const valueB = (b as any)[sortConfig.key]?.toString().toLowerCase() || "";
        if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      }
    });
    setFilteredBookings(sorted);
  }, [sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
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
        Object.values(booking).some((value) =>
          value.toString().toLowerCase().includes(lower)
        )
      );
      setFilteredBookings(results);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const getStatusBadge = (status: string) => {
    const variants = {
      rejected: "bg-red-100 dark:bg-red-950",
      confirmed: "bg-emerald-100 dark:bg-emerald-950",
    };
    return (
      <span className={`px-3 py-1 rounded-full ${variants[status] || 'bg-gray-300 text-black dark:bg-gray-700 dark:text-white'}`}>
        {status}
      </span>
    );
  };

  const formatTime = (time: string | number) => {
    if (typeof time === "number") {
      const date = new Date(time);
      return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow transition-all duration-300 focus:ring-2 focus:ring-primary"
        />
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
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
                  className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort(key)}
                >
                  {label}{" "}
                  {sortConfig?.key === key &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedBookings).map(([bookedDate, bookings]) => (
              <React.Fragment key={bookedDate}>
                <TableRow className="bg-muted/50 cursor-pointer" onClick={() => toggleDate(bookedDate)}>
                  <TableCell colSpan={10} className="font-bold">
                    {expandedDates[bookedDate] ? "▼" : "▶"} {new Date(bookedDate).toDateString()} ({bookings.length})
                  </TableCell>
                </TableRow>

                {expandedDates[bookedDate] &&
                  bookings.map((booking, idx) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <TableCell>{booking.bookedDate}</TableCell>
                      <TableCell>{booking.username}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{booking.id}</TableCell>
                      <TableCell>{booking.bookingDate}</TableCell>
                      <TableCell>{booking.bookingTime}</TableCell>
                      <TableCell>{booking.consoleType}</TableCell>
                      <TableCell>{booking.startTime ? formatTime(booking.startTime) : "Not started"}</TableCell>
                      <TableCell>{booking.endTime ? formatTime(booking.endTime) : "Not ended"}</TableCell>
                      <TableCell>{booking.type}</TableCell>
                    </motion.tr>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}