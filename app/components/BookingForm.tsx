import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import { X, User, Mail, Phone, Calendar, CreditCard, Clock, Wallet, ChevronLeft, CheckCircle, Loader2, Sparkles, TowerControl as GameController2, Users, CalendarDays } from 'lucide-react';
import { ConsoleType } from './types';
import { BOOKING_URL } from '@/src/config/env';

interface BookingFormProps {
  selectedConsole: ConsoleType;
  onBack: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ selectedConsole, onBack }) => {
  // User information
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);
  const [refreshDashboard, setRefreshDashboard] = useState(false);

  // Add these state declarations at the top if not already present
  const [waiveOffAmount, setWaiveOffAmount] = useState(0);
  const [extraControllerFare, setExtraControllerFare] = useState(0);

  
  // Booking details
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();

    // Get UTC time + IST offset (5 hours 30 minutes = 330 minutes)
    const istOffsetMs = 330 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffsetMs);

    return istTime.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  });

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  
  // Payment
  const [paymentType, setPaymentType] = useState<string>("");
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Vendor information from JWT token
  const [vendorId, setVendorId] = useState<number | null>(null);

  const [userList, setUserList] = useState<{ name: string; email: string; phone: string }[]>([]);

  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [focusedInput, setFocusedInput] = useState<string>("");

  const handleEmailInputChange = (value: string) => {
    setEmail(value);
    console.log("logging user", userList )
    const suggestions = userList.filter(user =>
      user.email.toLowerCase().includes(value.toLowerCase())
    );
    setEmailSuggestions(suggestions);
  };

  
  const handlePhoneInputChange = (value: string) => {
    setPhone(value);
    const suggestions = userList.filter(user =>
      user.phone.includes(value)
    );
    setPhoneSuggestions(suggestions);
  };

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;

    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token);
      const vendorIdFromToken = decoded.sub.id;
      setVendorId(vendorIdFromToken);

      const userCacheKey = `userList`;
      const cachedData = localStorage.getItem(userCacheKey);

      const isCacheValid = (timestamp: number) => {
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        return now - timestamp < tenMinutes;
      };

      const fetchUsers = async () => {
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

      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          if (isCacheValid(timestamp)) {
            console.log("Loaded users from valid cache");
            setUserList(data);
          } else {
            console.log("Cache expired, fetching new data");
            fetchUsers();
          }
        } catch (parseError) {
          console.error("Error parsing cached users:", parseError);
          fetchUsers();
        }
      } else {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }, []);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    if (selectedSlots.length === 0) newErrors.slots = "Please select at least one time slot";
    if (!paymentType) newErrors.payment = "Please select a payment method";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch available slots
  useEffect(() => {
    if (!vendorId || !selectedConsole.id) return;
    
    const fetchAvailableSlots = async () => {
      try {
        const response = await fetch(
          `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${selectedConsole.id}/${selectedDate.replace(/-/g, "")}`
        );

        if (!response.ok) throw new Error("Failed to fetch slots");

        const data = await response.json();

        // Step 1: Get current time in IST
        const nowIST = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );

        // Step 2: Create datetime for each slot and compare
        const filteredSlots = (data.slots || []).map((slot: any) => {
          const slotDateTime = new Date(`${selectedDate}T${slot.start_time}+05:30`);
          
          const isPast = slotDateTime < nowIST;

          return {
            ...slot,
            is_available: slot.is_available && !isPast // override availability
          };
        });

        setAvailableSlots(filteredSlots);
      } catch (error) {
        console.error("Error fetching available slots:", error);
      }
    };


    fetchAvailableSlots();
  }, [vendorId, selectedDate, selectedConsole.id]);

  const handleSlotClick = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
    if (errors.slots) setErrors(prev => ({...prev, slots: ""}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${BOOKING_URL}/api/newBooking/vendor/${vendorId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consoleType: selectedConsole.type,
            name,
            email,
            phone,
            bookedDate: selectedDate,
            slotId: selectedSlots,
            paymentType,
            waiveOffAmount, // new
            extraControllerFare, // new
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to submit booking");

      setIsSubmitted(true);

      // ✅ Notify dashboard to refresh immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dashboard"));
      }

      // Check if the submitted user exists in cache
      const userCacheKey = "userList";
      const cached = localStorage.getItem(userCacheKey);

      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);

          const isUserExists = data.some(
            (user: any) =>
              user.email === email || user.phone === phone // Adjust logic as needed
          );

          if (!isUserExists) {
            console.log("New user detected, updating cache...");
            // Fetch updated user list and cache it
            const usersResponse = await fetch(
              `${BOOKING_URL}/api/vendor/${vendorId}/users`
            );
            const updatedUsers = await usersResponse.json();

            if (Array.isArray(updatedUsers)) {
              localStorage.setItem(
                userCacheKey,
                JSON.stringify({ data: updatedUsers, timestamp: Date.now() })
              );
            }
          } else {
            console.log("User already in cache. No update needed.");
          }
        } catch (err) {
          console.error("Error checking or updating user cache:", err);
        }
      }

    } catch (error) {
      console.error("Error submitting booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = Math.max(
    0,
    selectedSlots.length * selectedConsole.price -
      waiveOffAmount +
      extraControllerFare
  );

  if (isSubmitted) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-transparent dark:bg-transparent rounded-xl shadow-lg p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center shadow-lg"
          >
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>
          
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            Your booking for <span className="font-semibold text-emerald-600">{selectedConsole.name}</span> has been successfully created.
          </p>
          
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="font-bold text-emerald-600 text-lg">₹{totalAmount}</span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-green-700 shadow-md transition-all duration-200"
          >
            Make Another Booking
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Compact Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 bg-transparent border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-transparent rounded-full transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>
          <div>
            <h1 className="text-lg font-bold bg-transparent bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Book {selectedConsole.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
          <GameController2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
          <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">
            ₹{selectedConsole.price}/slot
          </span>
        </div>
      </motion.div>


      {/* Compact Form Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left Column - Customer & Date */}
            <div className="lg:col-span-2 space-y-3">
              {/* Customer Details - Compact */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-transparent rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    Customer Information
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="relative">
                    <motion.input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailInputChange(e.target.value)}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => {
                        setFocusedInput("");
                        setEmailSuggestions([]);
                      }}
                      className={`w-full pl-8 pr-2 py-2 bg-transparent rounded border transition-all duration-200 text-sm ${
                        errors.email 
                          ? "border-red-500 focus:border-red-500" 
                          : focusedInput === "email"
                          ? "border-emerald-500 focus:border-emerald-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-emerald-500"
                      } focus:outline-none focus:ring-1 focus:ring-emerald-500/20`}
                      placeholder="Email"
                      autoComplete="off"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                    <AnimatePresence>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-1 text-xs text-red-500"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                      {emailSuggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-full mt-1 max-h-32 overflow-y-auto"
                        >
                          {emailSuggestions.map((user, idx) => (
                            <motion.li
                              key={idx}
                              whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                              className="px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-xs"
                              onMouseDown={() => {
                                setEmail(user.email);
                                setName(user.name);
                                setPhone(user.phone);
                                setEmailSuggestions([]);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                  <User className="w-2.5 h-2.5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                                  <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                                </div>
                              </div>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <motion.input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      onFocus={() => setFocusedInput("phone")}
                      onBlur={() => {
                        setFocusedInput("");
                        setPhoneSuggestions([]);
                      }}
                      className={`w-full pl-8 pr-2 py-2 bg-transparent rounded border transition-all duration-200 text-sm ${
                        errors.phone 
                          ? "border-red-500 focus:border-red-500" 
                          : focusedInput === "phone"
                          ? "border-emerald-500 focus:border-emerald-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-emerald-500"
                      } focus:outline-none focus:ring-1 focus:ring-emerald-500/20`}
                      placeholder="Phone"
                      autoComplete="off"
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                    <AnimatePresence>
                      {errors.phone && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="mt-1 text-xs text-red-500"
                        >
                          {errors.phone}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                      {phoneSuggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-full mt-1 max-h-32 overflow-y-auto"
                        >
                          {phoneSuggestions.map((user, idx) => (
                            <motion.li
                              key={idx}
                              whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                              className="px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-xs"
                              onMouseDown={() => {
                                setPhone(user.phone);
                                setName(user.name);
                                setEmail(user.email);
                                setPhoneSuggestions([]);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                  <User className="w-2.5 h-2.5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                                  <p className="text-gray-600 dark:text-gray-400">{user.phone}</p>
                                </div>
                              </div>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    {isLoadingUser ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      <>
                        <motion.input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocusedInput("name")}
                          onBlur={() => setFocusedInput("")}
                          className={`w-full pl-8 pr-2 py-2 bg-transparent rounded border transition-all duration-200 text-sm ${
                            errors.name 
                              ? "border-red-500 focus:border-red-500" 
                              : focusedInput === "name"
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-gray-200 dark:border-gray-600 focus:border-emerald-500"
                          } focus:outline-none focus:ring-1 focus:ring-emerald-500/20`}
                          placeholder="Full name"
                        />
                        <User className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        <AnimatePresence>
                          {errors.name && (
                            <motion.p
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="mt-1 text-xs text-red-500"
                            >
                              {errors.name}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Date & Payment Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Date Selection - Compact */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-transparent rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                      Date
                    </h3>
                  </div>
                  
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-2 py-2 bg-transparent dark:bg-transparent rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                  />
                </motion.div>

                {/* Payment Method - Compact */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-transparent dark:bg-transparent rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                      <CreditCard className="w-4 h-4 text-yellow-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                      Payment
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {['Cash', 'Online'].map(type => (
                      <motion.button
                        key={type}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setPaymentType(type);
                          if (errors.payment) setErrors(prev => ({...prev, payment: ""}));
                        }}
                        className={`p-2 rounded border transition-all duration-200 text-xs ${
                          paymentType === type
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {type === 'Cash' ? (
                            <Wallet className="w-3 h-3" />
                          ) : (
                            <CreditCard className="w-3 h-3" />
                          )}
                          <span className="font-medium">{type}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  
                  <AnimatePresence>
                    {errors.payment && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-1 text-xs text-red-500"
                      >
                        {errors.payment}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Time Slots - Compact */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-transparent dark:bg-transparent rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                      <Clock className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                      Time Slots
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-300 rounded-full"></div>
                      <span className="text-gray-600 dark:text-gray-400">Booked</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-transparent dark:bg-transparent rounded p-2">
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-3 text-gray-500 dark:text-gray-400">
                      <Clock className="w-5 h-5 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No available slots</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                      {availableSlots.map((slot) => (
                        <motion.button
                          key={slot.slot_id}
                          type="button"
                          whileHover={{ scale: slot.is_available ? 1.05 : 1 }}
                          whileTap={{ scale: slot.is_available ? 0.95 : 1 }}
                          onClick={() => {
                            if (slot.is_available) handleSlotClick(slot.slot_id);
                          }}
                          disabled={!slot.is_available}
                          className={`p-1.5 rounded text-xs font-medium transition-all duration-200 ${
                            selectedSlots.includes(slot.slot_id)
                              ? "bg-emerald-500 text-white shadow-sm transform scale-105"
                              : slot.is_available
                              ? "bg-transparent dark:bg-transparent border border-gray-200 dark:border-gray-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                              : "bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed opacity-60"
                          }`}
                        >
                          {slot.start_time.slice(0, 5)}
                        </motion.button>
                      ))}
                    </div>
                  )}
                  
                  <AnimatePresence>
                    {errors.slots && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-2 text-xs text-red-500"
                      >
                        {errors.slots}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {selectedSlots.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded"
                      >
                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                          Selected:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedSlots.map(slotId => {
                            const slot = availableSlots.find(s => s.slot_id === slotId);
                            return (
                              <motion.div
                                key={slotId}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                              >
                                {slot?.start_time.slice(0, 5)}
                                <button 
                                  type="button"
                                  onClick={() => handleSlotClick(slotId)}
                                  className="ml-0.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
                                >
                                  <X size={10} />
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-3">
              {/* Booking Summary - Compact */}
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-transparent dark:bg-transparent rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    Summary
                  </h3>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Console:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedConsole.name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Slots:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedSlots.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                    <span className="font-medium text-gray-800 dark:text-white">₹{selectedConsole.price}/slot</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Waive Off:</span>
                    <input
                      type="number"
                      value={waiveOffAmount}
                      onChange={(e) => setWaiveOffAmount(Number(e.target.value))}
                      placeholder="₹0"
                      className="w-16 text-right px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-transparent text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors text-xs"
                      min={0}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Extra Controller:</span>
                    <input
                      type="number"
                      value={extraControllerFare}
                      onChange={(e) => setExtraControllerFare(Number(e.target.value))}
                      placeholder="₹0"
                      className="w-16 text-right px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-transparent text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors text-xs"
                      min={0}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded px-2">
                    <span className="font-bold text-gray-800 dark:text-white text-sm">Total:</span>
                    <span className="font-bold text-lg text-emerald-600">₹{totalAmount}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Compact Submit Button */}
          <motion.button
            type="submit"
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className={`w-full py-2.5 rounded-lg font-bold text-white transition-all duration-200 shadow-md ${
              isSubmitting 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:shadow-lg"
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Complete Booking - ₹{totalAmount}
              </div>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;