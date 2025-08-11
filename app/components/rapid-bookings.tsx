"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Gamepad2,
  Gamepad,
  Headset,
  Search,
  Clock,
  Phone,
  User,
  CreditCard,
  Filter,
  X,
  ChevronDown,
  Wallet,
  GamepadIcon,
  AlertCircle,
  Cash,
  DollarSign,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { decode } from "punycode";
import { jwtDecode } from "jwt-decode";
import { RESPONSE_LIMIT_DEFAULT } from "next/dist/server/api-utils";
import { Console } from "console";
import { createEmptyCacheNode } from "next/dist/client/components/app-router";
import { BOOKING_URL, DASHBOARD_URL } from "@/src/config/env";

type Platform = "PS5" | "XBOX" | "VR" | "PC";
type TimeSlot = {
  slot_id: string | number;
  time: string;
  available: boolean;
};
type SystemStatus = "available" | "occupied";

interface System {
  id: number;
  name: string;
  type: Platform;
  icon: React.JSX.Element;
  price: string;
  status: SystemStatus;
  number: string;
}

interface Filters {
  type: string;
  status: SystemStatus | "all";
  price: string;
}

function RapidBookings() {
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null
  );
  const [paymentType, setPaymentType] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [consoleType, setConsoleType] = useState("");
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Returns date in YYYY-MM-DD format
  });  

  const [selectedName, setSelectedName] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  const [selectedSlots, setSelectedSlots] = React.useState<string[]>([]);
  const [userList, setUserList] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<UserType[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<UserType[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<{ contactNumber?: string; time?: string }>({});


  const [time, setTime] = useState("");
  const [vendorId, setVendorId] = useState(null);
  const [filters, setFilters] = useState<Filters>({
    type: "all",
    status: "all",
    price: "all",
  });
  const [activeFilters, setActiveFilters] = useState(0);
  const [rapidbooking, setrapidbooking] = useState<System[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');


  const handleNameInputChange = (value: string) => {
    setName(value);
    if (!value) {
      setNameSuggestions([]);
      return;
    }
    const matches = userList.filter((user) =>
      user.name.toLowerCase().includes(value.toLowerCase())
    );
    setNameSuggestions(matches.slice(0, 5)); // limit suggestions
  };

  const handlePhoneInputChange = (value: string) => {
    setPhone(value);
    if (!value) {
      setPhoneSuggestions([]);
      return;
    }
    const matches = userList.filter((user) =>
      user.phone.includes(value)
    );
    setPhoneSuggestions(matches.slice(0, 5)); // limit suggestions
  };


  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      const vendor_id = decoded_token.sub.id;
      setVendorId(vendor_id);
    }
  }, []);

  const validateForm = (selectedName: any, selectedSlots: string[]) => {
    const errors: { contactNumber?: string; time?: string } = {};

    console.log(selectedName);

    const phoneToValidate = selectedName?.phone || phone;

    console.log("Phone alla", phoneToValidate);

    if (!/^\d{10}$/.test(phoneToValidate)) {
      errors.contactNumber = "Please enter a valid 10-digit phone number";
    }else{
      setContactNumber(phoneToValidate)
    }

    if (!selectedSlots || selectedSlots.length === 0) {
      errors.time = "Please select a time";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (vendorId !== null) {
      getAllDevices(vendorId);
    }
  }, [vendorId]); // <- This ensures it runs only after vendorId is set

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;

    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token);
      const vendorIdFromToken = decoded.sub.id;
      setVendorId(vendorIdFromToken);

      const cachedData = localStorage.getItem("userList");
      const isCacheValid = (timestamp: number) => {
        const now = Date.now();
        return now - timestamp < 10 * 60 * 1000; // 10 minutes
      };

      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (isCacheValid(timestamp)) {
            setUserList(data);
          } else {
            getAllUsers(vendorIdFromToken);
          }
        } catch (e) {
          getAllUsers(vendorIdFromToken);
        }
      } else {
        getAllUsers(vendorIdFromToken);
      }
    } catch (e) {
      console.error("Token decode error", e);
    }
  }, []);

  const System_data: System[] = rapidbooking.map((item: any) => {
    let systemData: System = {
      id: parseInt(item.consoleId),
      consoleModelNumber: item.consoleModelNumber,
      name: item.brand,
      type: item.consoleType as Platform,
      icon: <Monitor className="w-6 h-6" />,
      price: item.consolePrice,
      status: item.is_available ? "available" : "occupied",
      number: item.console_type_id,
    };
  
    // Map console type to the correct icon and price
    switch (item.consoleTypeName) {
      case "ps5":
        systemData.icon = <Gamepad2 className="w-6 h-6" />;
        break;
      case "xbox":
        systemData.icon = <Gamepad className="w-6 h-6" />;
        break;
      case "vr":
        systemData.icon = <Headset className="w-6 h-6" />;
        break;
      case "pc":
        systemData.icon = <Monitor className="w-6 h-6" />;
        break;
      default:
        systemData.icon = <Monitor className="w-6 h-6" />;
        break;
    }
  
    return systemData;
  });  


  function convert_Date(date:string){
    let[hour,minute] = date.split(":");
    let hoursname = parseInt(hour);
    const bucket = hoursname >= 12 ? "PM" : "AM";
    hoursname = hoursname % 12 || 12 ;
    const data = `${hoursname}:${minute}${bucket}`;
    return data;
  }

  const systems: System[] = System_data;

  const getTimeSlots = async (consoleTypeId: string) => {
    setIsLoadingSlots(true);
    try {
      const response = await axios.get(
        `${BOOKING_URL}/api/getSlotList/vendor/${vendorId}/game/${consoleTypeId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.data) {
        const slots: TimeSlot[] = response.data.map((slot: any) => ({
          slot_id: slot.slot_id || slot.id || String(slot.start_time),
          time: convert_Date(slot.start_time),
          available: slot.is_available,
        }));
        setTimeSlots(slots);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
  
      // Set default time slots for the next 6 hours, starting from the next full hour, with availability as false
      const defaultSlots: TimeSlot[] = [];
      const currentDate = new Date();
  
      // Round up to the next full hour if the current minute is not 0
      if (currentDate.getMinutes() !== 0) {
        currentDate.setHours(currentDate.getHours() + 1);
        currentDate.setMinutes(0);
      }
  
      for (let i = 0; i < 6; i++) {
        // Increment by one hour for each slot
        const slotTime = new Date(currentDate);
        slotTime.setHours(currentDate.getHours() + i);
  
        const timeString = convert_Date(slotTime.toTimeString().slice(0, 5)); // converting to 12-hour format
        defaultSlots.push({
          slot_id: String(i + 1),
          time: timeString,
          available: false, // availability set to false
        });
      }
      setTimeSlots(defaultSlots);
    } finally {
      setIsLoadingSlots(false);
    }
  };
  

  useEffect(() => {
    let count = 0;
    if (filters.type !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.price !== "all") count++;
    setActiveFilters(count);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      type: "all",
      status: "all",
      price: "all",
    });
    setSearchQuery("");
  };

  const handleBook = (system: System) => {
    setSelectedSystem(system);
    setShowBookingForm(true);
    setConsoleType(system.type);
    getTimeSlots(system.number);
  };

  const filteredSystems = systems.filter((system) => {
    if (
      searchQuery &&
      !system.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (filters.type !== "all" && system.consoleTypeName !== filters.type) return false;
    if (filters.status !== "all" && system.status !== filters.status)
      return false;
    if (filters.price === "low" && parseInt(system.price) > 60) return false;
    if (filters.price === "high" && parseInt(system.price) < 60) return false;
    return true;
  });

  const getStatusColor = (status: SystemStatus) => {
    return status === "available" ? "text-[#098637]" : "text-red-500";
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const getAllDevices = async (vendorId: number) => {
    try {
      const response = await axios.get(
        `${DASHBOARD_URL}/api/getAllDevice/vendor/${vendorId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = response.data;
      console.log("Fetched devices:", data);
      setrapidbooking(data);
    } catch (error) {
      console.error("Error fetching vendor devices", error);
    }
  };

  const getAllUsers = async (vendorIdFromToken: number) => {
    const userCacheKey = `userList`;

    try {
      const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorIdFromToken}/users`);
      const data = await response.json();
      console.log("Fetched users from API:", data);

      if (Array.isArray(data)) {
        setUserList(data);
        localStorage.setItem(
          userCacheKey,
          JSON.stringify({ data, timestamp: Date.now() })
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };


  const handleBooking = async (e) => {
    // e.preventDefault();
    setLoading(true);
    console.log("Form submission started");

    if (!validateForm(selectedName, selectedSlots)) {
      console.log("Form validation failed", formErrors);
      return;
    }

    try {
      console.log("Making API request...");
      console.log("Selected slots:", selectedSlots);
      console.log("Available time slots:", timeSlots);


      // Find the slot objects matching the selected slot times
      const selectedSlotObjects = timeSlots.filter(slot => selectedSlots.includes(slot.time));
      console.log("Selected slot objects:", selectedSlotObjects);

      if (selectedSlotObjects.length === 0) {
        throw new Error("No slot selected");
      }

      // Collect their slot_ids as strings
      const slotIds = selectedSlotObjects.map(slot => slot.slot_id.toString());

      const payload = {
        consoleType: selectedSystem?.type || consoleType,
        name: name,
        email: "demo@1example.com",
        phone: phone,
        bookedDate: date,
        slotId: slotIds,
        paymentType: paymentType,
        isRapidBooking: true,
        consoleId: selectedSystem?.id.toString(),
        userId: userId || null,
      };

      const response = await axios.post(
        `${BOOKING_URL}/api/newBooking/vendor/${vendorId}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data) {
        console.log("Booking successful:", response.data);
        setShowBookingForm(false);

        // Re-fetch updated lists
        if (vendorId) {
          getAllDevices(vendorId);
          getAllUsers(vendorId);
        }
      }
    } catch (error: any) {
      console.error("Error creating booking:", error);
      console.error("Error details:", error.response?.data || error.message);
    } finally {
      setShowBookingForm(false);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-4 space-y-6"
    >
      {/* Enhanced Header with Search and Filter */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            {/* Search and Filter Toggle */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search systems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full border-gray-200 focus:border-[#098637] focus:ring-[#098637]"
                />
              </div>
              <div className="flex items-center gap-2">
                {activeFilters > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={resetFilters}
                    className="px-3 py-1 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </motion.button>
                )}
                <Button
                  onClick={() => setFilterOpen(!filterOpen)}
                  variant="outline"
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    filterOpen
                      ? "bg-[#098637] text-white hover:bg-[#076d2a]"
                      : "hover:border-[#098637] hover:text-[#098637]"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFilters > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#098637] text-white"
                    >
                      {activeFilters}
                    </motion.span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      filterOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>

            {/* Enhanced Filter Panel */}
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          System Type
                        </Label>
                        <Select
                          value={filters.type}
                          onValueChange={(value) =>
                            setFilters({ ...filters, type: value })
                          }
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#098637] focus:ring-[#098637]">
                            <SelectValue placeholder="All Systems" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Systems</SelectItem>
                            <SelectItem value="pc">PC</SelectItem>
                            <SelectItem value="ps5">PlayStation</SelectItem>
                            <SelectItem value="xbox">Xbox</SelectItem>
                            <SelectItem value="vr">VR Station</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Status
                        </Label>
                        <Select
                          value={filters.status}
                          onValueChange={(value) =>
                            setFilters({
                              ...filters,
                              status: value as SystemStatus,
                            })
                          }
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#098637] focus:ring-[#098637]">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="available">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#098637]" />
                                Available
                              </div>
                            </SelectItem>
                            <SelectItem value="occupied">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Occupied
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Price Range
                        </Label>
                        <Select
                          value={filters.price}
                          onValueChange={(value) =>
                            setFilters({ ...filters, price: value })
                          }
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#098637] focus:ring-[#098637]">
                            <SelectValue placeholder="All Prices" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Prices</SelectItem>
                            <SelectItem value="low">Under ₹60/hr</SelectItem>
                            <SelectItem value="high">
                              ₹60/hr and above
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Active Filters Display */}
                    <AnimatePresence>
                      {activeFilters > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex flex-wrap gap-2 mt-4 pt-4 border-t"
                        >
                          {filters.type !== "all" && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#098637]/10 text-[#098637]"
                            >
                              Type: {filters.type}
                              <button
                                onClick={() =>
                                  setFilters({ ...filters, type: "all" })
                                }
                                className="ml-2 hover:text-[#076d2a]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.span>
                          )}
                          {filters.status !== "all" && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#098637]/10 text-[#098637]"
                            >
                              Status: {filters.status}
                              <button
                                onClick={() =>
                                  setFilters({ ...filters, status: "all" })
                                }
                                className="ml-2 hover:text-[#076d2a]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.span>
                          )}
                          {filters.price !== "all" && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#098637]/10 text-[#098637]"
                            >
                              Price:{" "}
                              {filters.price === "low"
                                ? "Under ₹60/hr"
                                : "₹60/hr and above"}
                              <button
                                onClick={() =>
                                  setFilters({ ...filters, price: "all" })
                                }
                                className="ml-2 hover:text-[#076d2a]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {!showBookingForm ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {filteredSystems.map((system, index) => (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg p-6 bg-card transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-blue-600 transform transition-transform hover:scale-110">
                    {system.icon}
                  </div>
                  <span className="font-semibold text-blue-600">
                    {system.price}/slot
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  #{system.consoleModelNumber}
                </h3>
                <p
                  className={`mb-4 ${getStatusColor(
                    system.status
                  )} flex items-center gap-2`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      system.status === "available"
                        ? "bg-green-600"
                        : "bg-red-500"
                    }`}
                  />
                  {system.status.charAt(0).toUpperCase() +
                    system.status.slice(1)}
                </p>
                <Button
                  onClick={() => handleBook(system)}
                  disabled={system.status !== "available"}
                  className={`w-full transition-all duration-300 ${
                    system.status === "available"
                      ? "bg-blue-600 hover:bg-blue-600 hover:scale-105"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {system.status === "available" ? "Book Now" : "Unavailable"}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
            {/* Booking Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:w-2/3 border rounded-2xl p-6 space-y-6 bg-white dark:bg-gray-900 shadow-xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
                  Book {selectedSystem?.name} #{selectedSystem?.consoleModelNumber}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBookingForm(false)}
                  className="hover:bg-red-100 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Booking Form Fields */}
              <form className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Phone Field */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <Input
                        className="pl-10"
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => handlePhoneInputChange(e.target.value)}
                        onBlur={() => setTimeout(() => setPhoneSuggestions([]), 150)}
                      />
                      {phoneSuggestions.length > 0 && (
                        <ul className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg w-full mt-1 text-sm max-h-48 overflow-y-auto">
                          {phoneSuggestions.map((user, idx) => (
                            <li
                              key={idx}
                              className="px-3 py-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer"
                              onMouseDown={() => {
                                setPhone(user.phone);
                                setName(user.name);
                                setEmail(user.email);
                                setSelectedName(user);
                                setPhoneSuggestions([]);
                                setNameSuggestions([]);
                                setContactNumber(user.phone);
                                setUserId(user.id);
                              }}
                            >
                              {user.phone} ({user.name})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {formErrors.contactNumber && (
                      <p className="text-red-500 text-sm">{formErrors.contactNumber}</p>
                    )}
                  </div>

                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                      <Input
                        className="pl-10"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => handleNameInputChange(e.target.value)}
                        onBlur={() => setTimeout(() => setNameSuggestions([]), 150)}
                      />
                      {nameSuggestions.length > 0 && (
                        <ul className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg w-full mt-1 text-sm max-h-48 overflow-y-auto">
                          {nameSuggestions.map((user, idx) => (
                            <li
                              key={idx}
                              className="px-3 py-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer"
                              onMouseDown={() => {
                                setName(user.name);
                                setPhone(user.phone);
                                setEmail(user.email);
                                setSelectedName(user);
                                setNameSuggestions([]);
                                setPhoneSuggestions([]);
                                setUserId(user.id);
                              }}
                            >
                              {user.name} ({user.phone})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Date</Label>
                    <Input
                      type="date"
                      className="pl-3"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    {errors.date && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">
                        {errors.date}
                      </motion.p>
                    )}
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Select Time Slots</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {isLoadingSlots ? (
                        <div className="col-span-3 text-center py-4 text-gray-500">Loading time slots...</div>
                      ) : (
                        timeSlots.map((slot, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: slot.available && !selectedSlots.includes(slot.time) ? 1.05 : 1 }}
                            whileTap={{ scale: slot.available && !selectedSlots.includes(slot.time) ? 0.95 : 1 }}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => {
                              if (!slot.available) return;
                              setSelectedSlots((prev) =>
                                prev.includes(slot.time)
                                  ? prev.filter((t) => t !== slot.time)
                                  : [...prev, slot.time]
                              );
                            }}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors text-center
                              ${
                                selectedSlots.includes(slot.time)
                                  ? "bg-gray-400 text-white"
                                  : slot.available
                                  ? "bg-[#098637] text-white hover:bg-[#076d2a]"
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                              }`}
                          >
                            {slot.time}
                          </motion.button>
                        ))
                      )}
                    </div>
                    {formErrors.time && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.time}</p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { key: "credit", label: "Card", icon: <CreditCard className="w-6 h-6" /> },
                        { key: "wallet", label: "Wallet", icon: <Wallet className="w-6 h-6" /> },
                        { key: "cash", label: "Cash", icon: <DollarSign className="w-6 h-6" /> },
                      ].map(({ key, label, icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaymentType(key)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all w-full
                            ${paymentType === key ? "border-[#098637] bg-[#e6f4ea]" : "border-gray-300 hover:border-[#098637]"}`}
                          aria-label={label}
                        >
                          <span className="text-[#098637]">{icon}</span>
                          <span className="text-xs mt-1">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowBookingForm(false)}
                      className="w-1/2"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleBooking}
                      className="w-1/2 bg-[#098637] hover:bg-[#076d2a]"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Booking...
                        </span>
                      ) : (
                        "Confirm Booking"
                      )}
                    </Button>
                  </div>
                </motion.div>
              </form>
            </motion.div>

            {/* Booking Summary */}
            <div className="md:w-1/3 sticky top-24 space-y-4">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
                <h3 className="text-base font-semibold mb-3 text-emerald-600">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Console:</span>
                    <span className="font-medium">{selectedSystem?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="font-medium">#{selectedSystem?.consoleModelNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slots:</span>
                    <span className="font-medium">{selectedSlots.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="font-medium">₹{selectedSystem?.price}/slot</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-600">₹{selectedSlots.length * selectedSystem?.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RapidBookings;

