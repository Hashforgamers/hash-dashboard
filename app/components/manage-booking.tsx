"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { jwtDecode } from "jwt-decode";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CalendarPlus,
  Edit,
  XCircle,
  Search,
  NotepadText,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  CreditCard,
  FileText,
  CalendarClock,
  ListTodo,
  LucideIcon,
  Loader2
} from "lucide-react";
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
import GridConsole from "./GridConsole"; // No curly braces for default export
import { error } from "console";
import axios from "axios";

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
    color: "bg-blue-100 dark:bg-blue-950", // Solid colors for light and dark modes
    iconColor: "#2563eb", // Light blue for the icon
  },
  {
    type: "change",
    label: "Change Booking",
    description: "Modify existing appointments",
    icon: CalendarClock,
    color: "bg-purple-100 dark:bg-purple-950", // Solid purple colors
    iconColor: "#7c3aed", // Purple for the icon
  },
  {
    type: "reject",
    label: "Reject Booking",
    description: "Cancel or decline bookings",
    icon: XCircle,
    color: "bg-red-100 dark:bg-red-950", // Solid red colors
    iconColor: "#ef4444", // Red for the icon
  },
  {
    type: "list",
    label: "List Bookings",
    description: "View all appointments",
    icon: ListTodo,
    color: "bg-emerald-100 dark:bg-emerald-950", // Solid green colors
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
        `https://hfg-booking.onrender.com/api/getAllConsole/vendor/${vendorId}`
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
          <GridConsole setSelectedAction={setSelectedAction} game={game} />
        );

      case "change":
        return <ChangeBookingForm />;
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
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${
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
        `https://hfg-booking.onrender.com/api/bookings/${bookingId}`
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
        `https://hfg-booking.onrender.com/api/getSlots/vendor/${vendorId}/game/${consoleTypeId}/${date.replaceAll("-", "")}`
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
        `https://hfg-booking.onrender.com/api/update_booking/${bookingId}`,
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
        `https://hfg-booking.onrender.com/api/bookings/${bookingId}`
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
          selected_slots: [`${booking.time_slot.start_time}`], // Preselect slot
          system: booking.system || "",
          vendorId: vendorId, // Hardcoded vendor ID (Update dynamically if needed)
          consoleTypeId: booking.game_id, // Extract console type ID
          start_time: booking.time_slot.start_time,
          end_time: booking.time_slot.end_time,
          amount_paid:booking.amount_paid,
        });

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
        `https://hfg-booking.onrender.com/api/bookings/reject`,
        {
          method: "POST", // Use POST instead of DELETE
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingId,
            rejection_reason: rejectionReason,
            repayment_type: repaymentType,
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

// Rest of the code remains the same...

function ListBooking() {
  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount
  
  const fetchData = async () => {
    try {
      // Get the start of the month
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Format as YYYYMMDD
      const formattedDate = startOfMonth
        .toISOString() // "2025-04-01T00:00:00.000Z"
        .slice(0, 10)   // "2025-04-01"
        .replace(/-/g, ""); // "20250401"
        
      const response = await axios.get(
        `https://hfg-booking.onrender.com/api/getAllBooking/vendor/${vendorId}/${formattedDate}/`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const mappedBookings = response.data.map((booking) => ({
        id: booking.bookingId.toString(),  // Ensure the ID is a string
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime, // Keep the time format as it is
        username: booking.userName,
        consoleType: booking.consoleType, // Assuming the consoleType is the name, adjust as needed
        bookedDate: booking.bookedDate,
        startTime: booking.startTime || null, // Ensure to handle null values
        endTime: booking.endTime || null,
        status: booking.status, // Status from API
        type: booking.type,
      }));

      // Set the bookings state after mapping
      setBookings(mappedBookings);
      setFilteredBookings(mappedBookings);
      return response.data;
    } catch (error) {
      console.error(
        "Error fetching data:",
        error.response ? error.response.data : error.message
      );
    }
  };

  useEffect(() => {
    if (!vendorId) return; // 🚨 Don't fetch if vendorId is not ready
  
    fetchData();
  }, [vendorId]);
  
 
  const [searchQuery, setSearchQuery] = useState("");

  const startTimer = (id: string) => {
    setBookings((prevBookings) =>
      prevBookings.map((booking) =>
        booking.id === id
          ? { ...booking, status: "In progress", startTime: Date.now() }
          : booking
      )
    );
    setFilteredBookings((prevFiltered) =>
      prevFiltered.map((booking) =>
        booking.id === id
          ? { ...booking, status: "In progress", startTime: Date.now() }
          : booking
      )
    );
  };

  const [bookings, setBookings] = useState([
    {
      id: null,
      bookingDate: null,
      bookingTime: null,
      username: null,
      consoleType: null,
      bookedDate: null,
      startTime: null,
      endTime: null,
      status: null,
      type:null,
    }
  ]);

  // Empty dependency array means this runs once when component mounts

  const [filteredBookings, setFilteredBookings] = useState(bookings);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    let sorted = [...filteredBookings];
    if (sortConfig) {
      sorted.sort((a, b) => {
        // Compare booking dates
        const dateA = new Date(a.bookingDate);
        const dateB = new Date(b.bookingDate);
        
        if (dateA < dateB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (dateA > dateB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    setFilteredBookings(sorted);
  }, [sortConfig]);
  

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction:
        sortConfig?.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };
  
  const handleSearch = () => {
    if (searchQuery.trim() === "") {
      setFilteredBookings(bookings);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const results = bookings.filter((booking) =>
        Object.values(booking).some((value) =>
          value.toString().toLowerCase().includes(lowerQuery)
        )
      );
      setFilteredBookings(results);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      "rejected": "bg-red-100 dark:bg-red-950",  // Red for rejected (light/dark mode)
      "confirmed": "bg-emerald-100 dark:bg-emerald-950",  // Green for confirmed (light/dark mode)
    };
  
    return <span className={`px-3 py-1 rounded-full ${variants[status] || 'bg-gray-300 text-black dark:bg-gray-700 dark:text-white'}`}>{status}</span>;
  };
  

  const formatTime = (time: string) => {
    const [hours, minutes, seconds] = time.split(":");
    return `${hours}:${minutes}`; // You can format it further if needed (e.g., `HH:mm`)
  };
  

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <div className="flex-grow">
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="transition-all duration-300 focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booking ID{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booking Date{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booking time{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                UserName{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Console Type{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booked Date{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Start time{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                End Timer{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Status{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Type{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredBookings.map((booking, index) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.time}</TableCell>
                  <TableCell>{booking.system}</TableCell>
                  <TableCell>{booking.user}</TableCell>
                  <TableCell>{booking.status}</TableCell>
                  <TableCell>
                    {booking.status === "Not played" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startTimer(booking.id)}
                      >
                        Start
                      </Button>
                    )}
                  </TableCell> */}
                  <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.bookingDate}</TableCell>
                  <TableCell>{booking.bookingTime}</TableCell>
                  <TableCell>{booking.username}</TableCell>
                  <TableCell>{booking.consoleType}</TableCell>
                  <TableCell>{booking.bookedDate}</TableCell>
                  <TableCell>
                  {booking.startTime ? formatTime(booking.startTime) : "Not started"}
                  </TableCell>
                  <TableCell>
                  {booking.endTime ? formatTime(booking.endTime) : "Not ended"}
                  </TableCell>

                  <TableCell>{getStatusBadge(booking.status)}</TableCell>

                  <TableCell>{booking.type}</TableCell>
                  {/* Other cells */}
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
