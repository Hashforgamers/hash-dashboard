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
  const [time, setTime] = useState("");
  const [venodorId, setVendorId] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    type: "all",
    status: "all",
    price: "all",
  });
  const [activeFilters, setActiveFilters] = useState(0);
  const [rapidbooking, setrapidbooking] = useState<System[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!/^\d{10}$/.test(contactNumber)) {
      newErrors.contactNumber = "Please enter a valid 10-digit phone number";
    }

    if (!consoleType) {
      newErrors.consoleType = "Please select a console type";
    }

    if (!paymentType) {
      newErrors.paymentType = "Please select a payment type";
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!date || selectedDate < today) {
      newErrors.date = "Please select a valid future date";
    }

    if (!time) {
      newErrors.time = "Please select a time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  useEffect(() => {
    const get_data = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        if (token) {
          const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
          const vendor_id1 = decoded_token.sub.id;
          setVendorId(vendor_id1);
          console.log("vendorId", vendor_id1);
          const response = await axios.get(
            `https://hfg-dashboard.onrender.com/api/getAllDevice/vendor/${venodorId}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!response) {
            throw new Error("NO respone from the server");
          } else {
            const data = await response.data;
            console.log("data", data);
            setrapidbooking(data);
          }
        }
      } catch (error) {
        console.error("Error in the getting vendorId", error);
      }
    };

    get_data(); //function call
  }, []);

  const System_data: System[] = rapidbooking.map((item: any) => {
    let systemData: System = {
      id: parseInt(item.consoleId),
      name: item.brand,
      type: item.consoleType as Platform,
      icon: <Monitor className="w-6 h-6" />,
      price: "₹60/hr",
      status: item.is_available ? "available" : "occupied",
      number: item.console_type_id,
    };
  
    // Map console type to the correct icon and price
    switch (item.consoleTypeName) {
      case "ps5":
        systemData.icon = <Gamepad2 className="w-6 h-6" />;
        systemData.price = "₹80/hr";
        break;
      case "xbox":
        systemData.icon = <Gamepad className="w-6 h-6" />;
        systemData.price = "₹60/hr";
        break;
      case "vr":
        systemData.icon = <Headset className="w-6 h-6" />;
        systemData.price = "₹150/hr";
        break;
      case "pc":
        systemData.icon = <Monitor className="w-6 h-6" />;
        systemData.price = "₹60/hr";
        break;
      default:
        systemData.icon = <Monitor className="w-6 h-6" />;
        systemData.price = "₹66/hr";
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
        `https://hfg-booking.onrender.com/api/getSlotList/vendor/${venodorId}/game/${consoleTypeId}`,
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

  const handelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission started");

    if (!validateForm()) {
      console.log("Form validation failed", errors);
      return;
    }

    try {
      console.log("Making API request...");
      console.log("Selected time:", time);
      console.log("Available time slots:", timeSlots);
      
      const selectedSlot = timeSlots.find(slot => slot.time === time);
      console.log("Selected slot:", selectedSlot);

      if (!selectedSlot) {
        throw new Error("No slot selected");
      }

      const payload = {
        consoleType: selectedSystem?.type || consoleType,
        name: name,
        email: "demo@1example.com",
        phone: contactNumber,
        bookedDate: date,
        slotId: [selectedSlot.slot_id.toString()],
        paymentType: paymentType,
        isRapidBooking: true,
        consoleId: selectedSystem?.id.toString()
      };

      const response = await axios.post(
        `https://hfg-booking.onrender.com/api/newBooking/vendor/${venodorId}`,
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
        window.location.href = "/";
      }
    } catch (error: any) {
      console.error("Error creating booking:", error);
      console.error("Error details:", error.response?.data || error.message);
    } finally {
      // Close the modal regardless of success or failure
      setShowBookingForm(false);
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
                className="border rounded-lg p-6 hover:border-[#098637] transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[#098637] transform transition-transform hover:scale-110">
                    {system.icon}
                  </div>
                  <span className="font-semibold text-[#098637]">
                    {system.price}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {system.name} #{system.number}
                </h3>
                <p
                  className={`mb-4 ${getStatusColor(
                    system.status
                  )} flex items-center gap-2`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      system.status === "available"
                        ? "bg-[#098637]"
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
                      ? "bg-[#098637] hover:bg-[#076d2a] hover:scale-105"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {system.status === "available" ? "Book Now" : "Unavailable"}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto border rounded-lg p-6 space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                Book {selectedSystem?.name} #{selectedSystem?.number}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBookingForm(false)}
                className="hover:bg-red-100 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                    <Input
                      className="pl-9"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                    <Input
                      className="pl-9"
                      placeholder="Enter phone number"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      className="pl-9"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  {errors.date && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-red-500 mt-1"
                    >
                      {errors.date}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {isLoadingSlots ? (
                      <div className="col-span-3 text-center py-4">
                        Loading time slots...
                      </div>
                    ) : (
                      timeSlots.map((slot, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: slot.available ? 1.05 : 1 }}
                          whileTap={{ scale: slot.available ? 0.95 : 1 }}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setTime(slot.time)}
                          className={`p-2 rounded-lg text-center transition-colors ${
                            time === slot.time
                              ? "bg-[#076d2a] text-white"
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
                </div>

                <motion.div
                  className="space-y-2"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Label
                    htmlFor="consoleType"
                    className="text-sm font-medium flex items-center gap-1"
                  >
                    Console Type{" "}
                    {errors.consoleType && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </Label>
                  <div className="relative">
                    <GamepadIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                    <Select value={consoleType} onValueChange={setConsoleType}>
                      <SelectTrigger
                        id="consoleType"
                        className={`pl-9 transition-all duration-200 ${
                          errors.consoleType
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-[#098637] focus:ring-[#098637]"
                        }`}
                      >
                        <SelectValue placeholder="Select console type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PC">Gaming PC</SelectItem>
                        <SelectItem value="Xbox">Xbox Series X</SelectItem>
                        <SelectItem value="VR">VR Headset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.consoleType && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-red-500 mt-1"
                    >
                      {errors.consoleType}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  className="space-y-2"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.4 }}
                >
                  <Label className="text-sm font-medium flex items-center gap-1">
                    Payment Method
                  </Label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-[#098637] focus:border-[#098637] transition-all duration-200"
                  >
                    <option value="credit">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#098637]" />
                        Credit/Debit Card
                      </div>
                    </option>
                    <option value="wallet">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#098637]" />
                        Digital Wallet (Google Pay, Apple Pay, PayPal)
                      </div>
                    </option>
                    <option value="cash">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-[#098637]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        Cash (Pay at location)
                      </div>
                    </option>
                  </select>
                </motion.div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBookingForm(false)}
                    className="w-1/2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handelBooking}
                    className="w-1/2 bg-[#098637] hover:bg-[#076d2a]"
                  >
                    Confirm Booking
                  </Button>
                </div>
              </motion.div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RapidBookings;
