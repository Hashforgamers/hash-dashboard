
"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Gamepad2,
  Calendar as CalendarIcon,
  Clock,
  Users,
  ShoppingCart,
  User,
  ChevronRight,
  Plus,
  Minus,
  Menu,
  X,
  CalendarClock,
  XCircle,
  ListTodo,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import { BOOKING_URL } from "@/src/config/env";
import React from "react";

export default function BookingSystem({ setSelectedAction, game }) {
  const [activeTab, setActiveTab] = useState("console");
  const [selectedConsole, setSelectedConsole] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [gamingMode, setGamingMode] = useState("solo");
  const [playerCount, setPlayerCount] = useState(1);
  const [addons, setAddons] = useState([]);
  const [userDetails, setUserDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [showManageBooking, setShowManageBooking] = useState(null);

  const consoles = [
    { id: 1, name: "PlayStation 4", price: 15, icon: "🎮", color: "blue" },
    { id: 2, name: "PlayStation 5", price: 25, icon: "🎯", color: "purple" },
    { id: 3, name: "Gaming PC", price: 20, icon: "💻", color: "green" },
  ];

  const availableAddons = [
    { id: 1, name: "Energy Drink", price: 5, icon: "🥤" },
    { id: 2, name: "Snacks Combo", price: 8, icon: "🍿" },
    { id: 3, name: "Pizza Slice", price: 6, icon: "🍕" },
    { id: 4, name: "Premium Headset", price: 10, icon: "🎧" },
  ];

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 10;
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  const tabs = [
    { id: "console", label: "Console", icon: Gamepad2 },
    { id: "datetime", label: "Date & Time", icon: CalendarIcon },
    { id: "mode", label: "Gaming Mode", icon: Users },
    { id: "addons", label: "Add-ons", icon: ShoppingCart },
    { id: "details", label: "Your Details", icon: User },
  ];

  const updateAddon = (addonId, quantity) => {
    setAddons((prev) => {
      const existing = prev.find((a) => a.id === addonId);
      if (existing) {
        if (quantity === 0) {
          return prev.filter((a) => a.id !== addonId);
        }
        return prev.map((a) => (a.id === addonId ? { ...a, quantity } : a));
      }
      const addon = availableAddons.find((a) => a.id === addonId);
      return [...prev, { ...addon, quantity }];
    });
  };

  const calculateTotal = () => {
    const consolePrice = selectedConsole?.price || 0;
    const modeMultiplier = gamingMode === "multiplayer" ? playerCount * 0.8 : 1;
    const addonsTotal = addons.reduce(
      (sum, addon) => sum + addon.price * addon.quantity,
      0
    );
    return (consolePrice * modeMultiplier + addonsTotal).toFixed(2);
  };

  const isTabComplete = (tabId) => {
    switch (tabId) {
      case "console":
        return selectedConsole !== null;
      case "datetime":
        return selectedDate !== null && selectedTime !== null;
      case "mode":
        return true;
      case "addons":
        return true;
      case "details":
        return (
          userDetails.name && userDetails.email && userDetails.phone
        );
      default:
        return false;
    }
  };

  const canProceed = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    return tabs
      .slice(0, currentIndex + 1)
      .every((tab) => isTabComplete(tab.id));
  };

  const handleNext = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  const handleBooking = () => {
    console.log({
      console: selectedConsole,
      date: selectedDate,
      time: selectedTime,
      mode: gamingMode,
      players: playerCount,
      addons,
      user: userDetails,
      total: calculateTotal(),
    });
    alert("Booking confirmed!");
  };

  // Menu handler
  const handleMenuClick = (action) => {
    setMenuOpen(false);
    setShowManageBooking(action);
  };

  // Close manage booking view
  const closeManageBooking = () => {
    setShowManageBooking(null);
  };

  if (showManageBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={closeManageBooking}
              className="text-white"
            >
              <X className="w-5 h-5 mr-2" />
              Back to Booking
            </Button>
          </div>
          {showManageBooking === "change" && <ChangeBookingForm />}
          {showManageBooking === "reject" && <RejectBookingForm />}
          {showManageBooking === "list" && <ListBooking />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Menu */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Gaming Cafe Booking
            </h1>
            <p className="text-gray-300">Reserve your gaming session</p>
          </div>

          {/* Menu Dropdown */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Menu className="w-5 h-5" />
                Manage Bookings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleMenuClick("change")}>
                <CalendarClock className="w-4 h-4 mr-2" />
                Change Booking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMenuClick("reject")}>
                <XCircle className="w-4 h-4 mr-2" />
                Reject Booking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMenuClick("list")}>
                <ListTodo className="w-4 h-4 mr-2" />
                List Bookings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isComplete = isTabComplete(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg scale-105"
                    : isComplete
                    ? "bg-green-600/20 text-green-300 hover:bg-green-600/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {isComplete && !isActive && (
                  <span className="text-green-400">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardContent className="p-6">
                {activeTab === "console" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Select Your Console
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      {consoles.map((console) => (
                        <motion.button
                          key={console.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedConsole(console)}
                          className={`p-6 rounded-xl border-2 transition-all ${
                            selectedConsole?.id === console.id
                              ? "border-purple-500 bg-purple-600/20"
                              : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                          }`}
                        >
                          <div className="text-5xl mb-3">{console.icon}</div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            {console.name}
                          </h3>
                          <p className="text-2xl font-bold text-purple-400">
                            ${console.price}/hr
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "datetime" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Choose Date & Time
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-white mb-2">Select Date</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="bg-gray-700 rounded-lg p-3"
                          disabled={(date) => date < new Date()}
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2">
                          Select Time Slot
                        </Label>
                        <ScrollArea className="h-[300px] rounded-lg bg-gray-700 p-4">
                          <div className="grid grid-cols-3 gap-2">
                            {timeSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-2 rounded-lg text-sm transition-all ${
                                  selectedTime === time
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "mode" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Gaming Mode
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setGamingMode("solo");
                          setPlayerCount(1);
                        }}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          gamingMode === "solo"
                            ? "border-purple-500 bg-purple-600/20"
                            : "border-gray-600 bg-gray-700/50"
                        }`}
                      >
                        <User className="w-12 h-12 text-white mb-3 mx-auto" />
                        <h3 className="text-xl font-bold text-white">
                          Solo Play
                        </h3>
                        <p className="text-gray-400 text-sm mt-2">
                          Just you and the game
                        </p>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGamingMode("multiplayer")}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          gamingMode === "multiplayer"
                            ? "border-purple-500 bg-purple-600/20"
                            : "border-gray-600 bg-gray-700/50"
                        }`}
                      >
                        <Users className="w-12 h-12 text-white mb-3 mx-auto" />
                        <h3 className="text-xl font-bold text-white">
                          Multiplayer
                        </h3>
                        <p className="text-gray-400 text-sm mt-2">
                          Play with friends
                        </p>
                      </motion.button>
                    </div>

                    {gamingMode === "multiplayer" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6"
                      >
                        <Label className="text-white mb-3 block">
                          Number of Players
                        </Label>
                        <div className="flex items-center gap-4 justify-center">
                          <Button
                            onClick={() =>
                              setPlayerCount(Math.max(2, playerCount - 1))
                            }
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-3xl font-bold text-white w-16 text-center">
                            {playerCount}
                          </span>
                          <Button
                            onClick={() =>
                              setPlayerCount(Math.min(5, playerCount + 1))
                            }
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {activeTab === "addons" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Add-ons & Extras
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {availableAddons.map((addon) => {
                        const currentAddon = addons.find(
                          (a) => a.id === addon.id
                        );
                        const quantity = currentAddon?.quantity || 0;

                        return (
                          <div
                            key={addon.id}
                            className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{addon.icon}</span>
                                <div>
                                  <h3 className="font-semibold text-white">
                                    {addon.name}
                                  </h3>
                                  <p className="text-purple-400">
                                    ${addon.price}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() =>
                                  updateAddon(addon.id, Math.max(0, quantity - 1))
                                }
                                variant="outline"
                                size="sm"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="text-white font-bold w-8 text-center">
                                {quantity}
                              </span>
                              <Button
                                onClick={() => updateAddon(addon.id, quantity + 1)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Your Details
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Name</Label>
                        <Input
                          value={userDetails.name}
                          onChange={(e) =>
                            setUserDetails({ ...userDetails, name: e.target.value })
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Email</Label>
                        <Input
                          type="email"
                          value={userDetails.email}
                          onChange={(e) =>
                            setUserDetails({ ...userDetails, email: e.target.value })
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Phone</Label>
                        <Input
                          type="tel"
                          value={userDetails.phone}
                          onChange={(e) =>
                            setUserDetails({ ...userDetails, phone: e.target.value })
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <h3 className="font-bold text-white mb-3">
                        Booking Summary
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>Console:</span>
                          <span>{selectedConsole?.name}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Date:</span>
                          <span>
                            {selectedDate
                              ? format(selectedDate, "PPP")
                              : "Not selected"}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Time:</span>
                          <span>{selectedTime || "Not selected"}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Mode:</span>
                          <span className="capitalize">
                            {gamingMode}
                            {gamingMode === "multiplayer" &&
                              ` (${playerCount} players)`}
                          </span>
                        </div>
                        {addons.length > 0 && (
                          <div className="pt-2 border-t border-gray-600">
                            {addons.map((addon) => (
                              <div
                                key={addon.id}
                                className="flex justify-between text-gray-300"
                              >
                                <span>
                                  {addon.name} x{addon.quantity}
                                </span>
                                <span>${(addon.price * addon.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-gray-600">
                          <span>Total:</span>
                          <span className="text-purple-400">
                            ${calculateTotal()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(
                        (tab) => tab.id === activeTab
                      );
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1].id);
                      }
                    }}
                    disabled={activeTab === tabs[0].id}
                  >
                    Previous
                  </Button>

                  {activeTab === tabs[tabs.length - 1].id ? (
                    <Button
                      onClick={handleBooking}
                      disabled={!canProceed()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Book Now
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Change Booking Component
function ChangeBookingForm() {
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/bookings/${bookingId}`
      );
      const data = await response.json();

      if (response.ok && data.success && data.booking) {
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
      setBookingFound(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async (vendorId, consoleTypeId, date) => {
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${consoleTypeId}/${date.replaceAll(
          "-",
          ""
        )}`
      );
      const data = await response.json();

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
      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert("Failed to update booking.");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
      <CardContent className="p-6">
        <form className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Search Booking</h3>
            <div className="flex space-x-2">
              <Input
                id="bookingId"
                placeholder="Enter Booking ID"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />

              <Button
                type="button"
                onClick={handleSearch}
                disabled={isLoading}
                className="min-w-[100px]"
              >
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

          {bookingFound && bookingData && !isSubmitted ? (
            <div className="space-y-8">
              <h3 className="text-lg font-semibold text-white">
                Gamer's Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Name</Label>
                  <Input
                    value={bookingData.customer?.name || ""}
                    onChange={(e) =>
                      setBookingData((prev) => ({
                        ...prev,
                        customer: { ...prev.customer, name: e.target.value },
                      }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={bookingData.customer?.email || ""}
                    onChange={(e) =>
                      setBookingData((prev) => ({
                        ...prev,
                        customer: { ...prev.customer, email: e.target.value },
                      }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Phone Number</Label>
                  <Input
                    type="tel"
                    value={bookingData.customer?.phone || ""}
                    onChange={(e) =>
                      setBookingData((prev) => ({
                        ...prev,
                        customer: { ...prev.customer, phone: e.target.value },
                      }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white">
                Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Booking Date</Label>
                  <Input
                    type="date"
                    value={bookingData.booking_date || ""}
                    onChange={(e) =>
                      setBookingData((prev) => ({
                        ...prev,
                        booking_date: e.target.value,
                      }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Slot Time</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.slot_id}
                        type="button"
                        variant="outline"
                        disabled={!slot.is_available}
                        className={`rounded-full ${
                          bookingData.selected_slots.includes(slot.start_time)
                            ? "bg-purple-600 text-white"
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

          {isSubmitted && (
            <Alert className="bg-green-600/20 border-green-600">
              <AlertDescription className="text-green-300">
                Booking has been successfully updated.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// Reject Booking Component
function RejectBookingForm() {
  const [bookingId, setBookingId] = useState("");
  const [bookingFound, setBookingFound] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [bookingData, setBookingData] = useState(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [isConfirmingRejection, setIsConfirmingRejection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  const handleSearch = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/bookings/${bookingId}`
      );
      const data = await response.json();

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!confirmReject) {
      setConfirmReject(true);
      return;
    }

    setIsConfirmingRejection(true);
    setIsLoading(true);

    try {
      const response = await fetch(`${BOOKING_URL}/api/bookings/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          rejection_reason: rejectionReason,
          repayment_type: repaymentType,
          user_email: userEmail,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        console.error("Error rejecting booking");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsConfirmingRejection(false);
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
      <CardContent className="p-6">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Search Booking</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter Booking ID"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isLoading}
                className="min-w-[100px]"
              >
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
            <Alert className="bg-green-600/20 border-green-600">
              <AlertDescription className="text-green-300">
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
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white">
                      Booking Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-gray-700/50 border-gray-600">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Booking ID</span>
                              <span className="font-medium text-white">
                                {bookingData.booking_id || ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Date</span>
                              <span className="font-medium text-white">
                                {bookingData.booking_date || ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Time Slot</span>
                              <span className="font-medium text-white">
                                {bookingData.start_time || ""} -{" "}
                                {bookingData.end_time || ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">System</span>
                              <span className="font-medium text-white">
                                {bookingData.system || ""}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-700/50 border-gray-600">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Customer</span>
                              <span className="font-medium text-white">
                                {bookingData.customer?.name || ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Email</span>
                              <span className="font-medium text-white">
                                {bookingData.customer?.email || ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Phone</span>
                              <span className="font-medium text-white">
                                {bookingData.customer?.phone || ""}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Amount Paid</span>
                              <span className="font-medium text-white">
                                ${bookingData.amount_paid || ""}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white">
                      Rejection Details
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Reason for Rejection</Label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Please provide a detailed reason for rejecting this booking..."
                          className="min-h-[100px] bg-gray-700 border-gray-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Repayment Method</Label>
                        <Select value={repaymentType} onValueChange={setRepaymentType}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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
                          Are you sure you want to reject this booking? This action
                          cannot be undone.
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
      </CardContent>
    </Card>
  );
}

// List Booking Component (Placeholder - implement based on your needs)
function ListBooking() {
  return (
    <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">All Bookings</h3>
        <p className="text-gray-400">Booking list implementation goes here...</p>
      </CardContent>
    </Card>
  );
}
