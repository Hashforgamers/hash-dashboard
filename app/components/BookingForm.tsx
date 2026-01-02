import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import {
  X,
  User,
  Mail,
  Phone,
  CalendarDays,
  CreditCard,
  Clock,
  Wallet,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Sparkles,
  TowerControl as GameController2,
  Users,
  IndianRupee,
  Plus,
  Ticket  // ← Add this import
} from 'lucide-react';
import { ConsoleType } from './types';
import { BOOKING_URL } from '@/src/config/env';
import MealSelector from './mealSelector';

interface BookingFormProps {
  selectedConsole: ConsoleType;
  onBack: () => void;
}

interface SelectedMeal {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ selectedConsole, onBack }) => {
  // User information
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);

  // Meal selection states
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false);

  // Booking details
  const [waiveOffAmount, setWaiveOffAmount] = useState(0);
  const [extraControllerFare, setExtraControllerFare] = useState(0);
  const [autoWaiveOffAmount, setAutoWaiveOffAmount] = useState(0);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const istOffsetMs = 330 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffsetMs);
    return istTime.toISOString().split('T')[0];
  });

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Payment - Add Pass option
  const PAYMENT_TYPES = ['Cash', 'UPI', 'Pass']; // ← Updated
  const [paymentType, setPaymentType] = useState<string>('Cash');

  // ✅ Pass payment states
  const [passUid, setPassUid] = useState("");
  const [validatedPass, setValidatedPass] = useState<any>(null);
  const [isValidatingPass, setIsValidatingPass] = useState(false);
  const [passError, setPassError] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Vendor information from JWT token
  const [vendorId, setVendorId] = useState<number | null>(null);

  // User suggestion states
  const [userList, setUserList] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [emailSuggestions, setEmailSuggestions] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [focusedInput, setFocusedInput] = useState<string>("");

  const blurTimeoutRef = useRef<number | null>(null);

  // Calculate totals including meals
  const mealsTotal = selectedMeals.reduce((sum, meal) => sum + meal.total, 0);
  const consolePrice = selectedConsole.price || 0;
  
  const totalAmount = Math.max(
    0,
    selectedSlots.length * consolePrice - waiveOffAmount - autoWaiveOffAmount + extraControllerFare + mealsTotal
  );

  // ✅ Calculate hours needed for selected slots
  const calculateHoursForSlots = () => {
    if (selectedSlots.length === 0 || availableSlots.length === 0) return 0;

    let totalHours = 0;

    selectedSlots.forEach((slotId) => {
      const slot = availableSlots.find((s: any) => s.slot_id === slotId);
      if (!slot) return;

      const startTime = new Date(`${selectedDate}T${slot.start_time}+05:30`);
      const endTime = new Date(`${selectedDate}T${slot.end_time}+05:30`);

      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      totalHours += durationHours;
    });

    return Math.round(totalHours * 2) / 2; // Round to nearest 0.5
  };

  // ✅ Validate pass when UID is entered
  const validatePass = async (uid: string) => {
    if (!uid.trim() || !vendorId) return;

    setIsValidatingPass(true);
    setPassError("");

    try {
      const response = await fetch(`${BOOKING_URL}/api/pass/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pass_uid: uid.trim(),
          vendor_id: vendorId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setValidatedPass(data.pass);
        setPassError("");
        
        // Calculate hours needed for selected slots
        const hoursNeeded = calculateHoursForSlots();
        
        if (hoursNeeded > 0 && data.pass.remaining_hours < hoursNeeded) {
          setPassError(
            `Insufficient hours. Need ${hoursNeeded} hrs, available ${data.pass.remaining_hours} hrs`
          );
        }
      } else {
        setPassError(data.error || "Invalid pass");
        setValidatedPass(null);
      }
    } catch (err) {
      setPassError("Failed to validate pass");
      setValidatedPass(null);
    } finally {
      setIsValidatingPass(false);
    }
  };

  // ENHANCED: Calculate automatic wave-off amount based on elapsed time
  const calculateAutoWaiveOff = (slots: string[], slotsData: any[]) => {
    const nowIST = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    
    let totalAutoWaiveOff = 0;
    
    slots.forEach(slotId => {
      const slotData = slotsData.find(s => s.slot_id === slotId);
      if (!slotData) return;
      
      const slotDateTime = new Date(`${selectedDate}T${slotData.start_time}+05:30`);
      const slotEndTime = new Date(`${selectedDate}T${slotData.end_time}+05:30`);
      
      // Calculate slot duration in minutes
      const slotDurationMs = slotEndTime.getTime() - slotDateTime.getTime();
      const slotDurationMinutes = slotDurationMs / (1000 * 60);
      
      // Check if booking is made during the slot time
      if (nowIST >= slotDateTime && nowIST < slotEndTime) {
        // Calculate elapsed time since slot started
        const elapsedMs = nowIST.getTime() - slotDateTime.getTime();
        const elapsedMinutes = elapsedMs / (1000 * 60);
        
        // Calculate wave-off percentage based on elapsed time
        const elapsedPercentage = elapsedMinutes / slotDurationMinutes;
        const waveOffAmount = consolePrice * elapsedPercentage;
        
        totalAutoWaiveOff += waveOffAmount;
      }
      else if (nowIST >= slotEndTime) {
        totalAutoWaiveOff += consolePrice;
      }
    });
    
    // Round to nearest rupee
    return Math.round(totalAutoWaiveOff);
  };

  // Update automatic wave-off when selected slots change
  useEffect(() => {
    if (selectedSlots.length > 0 && availableSlots.length > 0) {
      const autoWaiveOff = calculateAutoWaiveOff(selectedSlots, availableSlots);
      setAutoWaiveOffAmount(autoWaiveOff);
    } else {
      setAutoWaiveOffAmount(0);
    }
  }, [selectedSlots, availableSlots, consolePrice, selectedDate]);

  // ✅ Revalidate pass when slots change
  useEffect(() => {
    if (paymentType === "Pass" && validatedPass && passUid) {
      const hoursNeeded = calculateHoursForSlots();
      if (hoursNeeded > 0 && validatedPass.remaining_hours < hoursNeeded) {
        setPassError(
          `Insufficient hours. Need ${hoursNeeded} hrs, available ${validatedPass.remaining_hours} hrs`
        );
      } else if (passError.includes("Insufficient hours")) {
        setPassError("");
      }
    }
  }, [selectedSlots, paymentType, validatedPass]);

  // Fetch vendor ID when component mounts
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token);
      const vendorIdFromToken = decoded.sub.id;
      setVendorId(vendorIdFromToken);
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }, []);

  // Fetch user list
  useEffect(() => {
    if (!vendorId) return;
    
    const userCacheKey = `userList`;
    const cachedData = localStorage.getItem(userCacheKey);

    const isCacheValid = (timestamp: number) => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      return now - timestamp < tenMinutes;
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`);
        const data = await response.json();

        if (Array.isArray(data)) {
          setUserList(data);
          localStorage.setItem(
            userCacheKey,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        if (isCacheValid(timestamp)) {
          setUserList(data);
        } else {
          fetchUsers();
        }
      } catch (parseError) {
        fetchUsers();
      }
    } else {
      fetchUsers();
    }
  }, [vendorId]);

  // Common function to filter suggestions by key and input value
  const getSuggestions = (key: keyof typeof userList[0], value: string) => {
    if (!value.trim()) {
      return userList;
    }
    
    const filtered = userList.filter((user) =>
      user[key].toLowerCase().includes(value.toLowerCase())
    );
    
    return filtered;
  };

  // Handlers for input changes
  const handleEmailInputChange = (value: string) => {
    setEmail(value);
    const suggestions = getSuggestions('email', value);
    setEmailSuggestions(suggestions);
    setFocusedInput('email');
  };

  const handlePhoneInputChange = (value: string) => {
    setPhone(value);
    const suggestions = getSuggestions('phone', value);
    setPhoneSuggestions(suggestions);
    setFocusedInput('phone');
  };

  const handleNameInputChange = (value: string) => {
    setName(value);
    const suggestions = getSuggestions('name', value);
    setNameSuggestions(suggestions);
    setFocusedInput('name');
  };

  // Focus handlers
  const handleEmailFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocusedInput("email");
    const suggestions = getSuggestions("email", email);
    setEmailSuggestions(suggestions);
  };

  const handlePhoneFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocusedInput("phone");
    const suggestions = getSuggestions("phone", phone);
    setPhoneSuggestions(suggestions);
  };

  const handleNameFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocusedInput("name");
    const suggestions = getSuggestions("name", name);
    setNameSuggestions(suggestions);
  };

  // Handler to clear suggestions with delay
  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setFocusedInput("");
      setEmailSuggestions([]);
      setPhoneSuggestions([]);
      setNameSuggestions([]);
      blurTimeoutRef.current = null;
    }, 150);
  };

  // On suggestion click handlers
  const handleSuggestionClick = (user: typeof userList[0]) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setEmail(user.email);
    setPhone(user.phone);
    setName(user.name);
    setEmailSuggestions([]);
    setPhoneSuggestions([]);
    setNameSuggestions([]);
    setFocusedInput("");
  };

  // Meal selection handlers
  const handleMealSelectorConfirm = (meals: SelectedMeal[]) => {
    setSelectedMeals(meals);
    setIsMealSelectorOpen(false);
  };

  const handleMealSelectorClose = () => {
    setIsMealSelectorOpen(false);
  };

  // ✅ Updated Form validation - includes pass validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (selectedSlots.length === 0) newErrors.slots = 'Please select at least one time slot';
    if (!paymentType) newErrors.payment = 'Please select a payment method';

    // ✅ Validate pass if Pass payment is selected
    if (paymentType === "Pass") {
      if (!passUid.trim()) {
        newErrors.pass = "Please enter pass UID";
      } else if (!validatedPass) {
        newErrors.pass = "Please validate the pass first";
      } else if (passError) {
        newErrors.pass = passError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch available slots using selectedConsole.id directly
  useEffect(() => {
    if (!vendorId || !selectedConsole.id) return;

    const fetchAvailableSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const response = await fetch(
          `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${selectedConsole.id}/${selectedDate.replace(/-/g, '')}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch slots');
        }

        const data = await response.json();

        const nowIST = new Date(
          new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
        );

        const filteredSlots = (data.slots || []).map((slot: any, index: number) => {
          const nextSlot = data.slots[index + 1];
          
          let isPast = false;
          
          if (nextSlot) {
            const nextSlotDateTime = new Date(`${selectedDate}T${nextSlot.start_time}+05:30`);
            isPast = nowIST >= nextSlotDateTime;
          } else {
            const slotEndTime = new Date(`${selectedDate}T${slot.end_time}+05:30`);
            isPast = nowIST >= slotEndTime;
          }

          return {
            ...slot,
            is_available: slot.is_available && !isPast,
          };
        });

        setAvailableSlots(filteredSlots);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [vendorId, selectedDate, selectedConsole.id]);

  const handleSlotClick = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
    if (errors.slots) setErrors((prev) => ({ ...prev, slots: '' }));
  };

  // ✅ Updated Submit handler - includes pass redemption
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // ✅ If payment is Pass, redeem pass first
      if (paymentType === "Pass" && validatedPass) {
        const hoursToDeduct = calculateHoursForSlots();

        const passRedeemResponse = await fetch(`${BOOKING_URL}/api/pass/redeem/dashboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pass_uid: passUid.trim(),
            vendor_id: vendorId,
            hours_to_deduct: hoursToDeduct,
            session_start: availableSlots.find((s: any) => s.slot_id === selectedSlots[0])?.start_time.slice(0, 5),
            session_end: availableSlots.find((s: any) => s.slot_id === selectedSlots[selectedSlots.length - 1])?.end_time.slice(0, 5),
            notes: `Booking for ${selectedConsole.name} - ${selectedSlots.length} slots`,
          }),
        });

        const passRedeemData = await passRedeemResponse.json();

        if (!passRedeemResponse.ok || !passRedeemData.success) {
          alert(`Pass redemption failed: ${passRedeemData.error}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Create booking
      const response = await fetch(`${BOOKING_URL}/api/newBooking/vendor/${vendorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consoleType: selectedConsole.type,
          name,
          email,
          phone,
          bookedDate: selectedDate,
          slotId: selectedSlots,
          paymentType, // Will be "Pass" if pass payment
          waiveOffAmount: waiveOffAmount + autoWaiveOffAmount,
          extraControllerFare,
          selectedMeals: selectedMeals.map(meal => ({
            menu_item_id: meal.menu_item_id,
            quantity: meal.quantity
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to submit booking');

      const result = await response.json();
      
      if (result.success) {
        setIsSubmitted(true);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        }

        // Cache management
        const userCacheKey = 'userList';
        const cached = localStorage.getItem(userCacheKey);

        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);

            const isUserExists = data.some(
              (user: any) => user.email === email || user.phone === phone
            );

            if (!isUserExists) {
              const usersResponse = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`);
              const updatedUsers = await usersResponse.json();

              if (Array.isArray(updatedUsers)) {
                localStorage.setItem(
                  userCacheKey,
                  JSON.stringify({ data: updatedUsers, timestamp: Date.now() })
                );
              }
            }
          } catch (err) {
            console.error('Error checking or updating user cache:', err);
          }
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center shadow-lg"
          >
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>

          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            Your booking for <span className="font-semibold text-emerald-600">{selectedConsole.name}</span>{' '}
            has been successfully created.
          </p>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 mb-4 text-xs text-left">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Console Type:</span>
              <span className="font-medium text-gray-800 dark:text-white">{selectedConsole.type}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Payment:</span>
              <span className="font-medium text-gray-800 dark:text-white">{paymentType}</span>
            </div>
            {paymentType === "Pass" && validatedPass && (
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">Hours Deducted:</span>
                <span className="font-medium text-emerald-600">{calculateHoursForSlots()} hrs</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span>
              <span className="font-medium text-gray-800 dark:text-white">
                {selectedMeals.length === 0
                  ? 'None'
                  : selectedMeals.map(meal => `${meal.name} (${meal.quantity})`).join(', ')}
              </span>
            </div>
            {paymentType !== "Pass" && (
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                <span className="font-bold text-emerald-600 text-lg">₹{totalAmount}</span>
              </div>
            )}
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
      {/* Header */}
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
            <p className="text-xs text-gray-500">Type: {selectedConsole.type} | ID: {selectedConsole.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
          <GameController2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
          <span className="text-emerald-700 dark:text-emerald-300 font-medium text-sm">
            ₹{consolePrice}/slot
          </span>
        </div>
      </motion.div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left Column - Customer Details */}
            <div className="lg:col-span-2 space-y-3">
              {/* Customer Details */}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Email Input */}
                  <div className="relative">
                    <motion.input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailInputChange(e.target.value)}
                      onFocus={handleEmailFocus}
                      onBlur={handleBlur}
                      autoComplete="off"
                      placeholder="Email"
                      className={`w-full pl-8 pr-2 py-2 bg-transparent rounded border transition-all duration-200 text-sm ${
                        errors.email
                          ? "border-red-500 focus:border-red-500"
                          : focusedInput === "email"
                          ? "border-emerald-500 focus:border-emerald-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-emerald-500"
                      } focus:outline-none focus:ring-1 focus:ring-emerald-500/20`}
                      style={{ boxSizing: "border-box" }}
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                    <AnimatePresence>
                      {focusedInput === "email" && emailSuggestions.length > 0 && (
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
                              onMouseDown={() => handleSuggestionClick(user)}
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

                  {/* Phone Input */}
                  <div className="relative">
                    <motion.input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      onFocus={handlePhoneFocus}
                      onBlur={handleBlur}
                      autoComplete="off"
                      placeholder="Phone"
                      className={`w-full pl-8 pr-2 py-2 bg-transparent rounded border transition-all duration-200 text-sm ${
                        errors.phone
                          ? "border-red-500 focus:border-red-500"
                          : focusedInput === "phone"
                          ? "border-emerald-500 focus:border-emerald-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-emerald-500"
                      } focus:outline-none focus:ring-1 focus:ring-emerald-500/20`}
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                    <AnimatePresence>
                      {focusedInput === "phone" && phoneSuggestions.length > 0 && (
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
                              onMouseDown={() => handleSuggestionClick(user)}
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

                  {/* Name Input */}
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
                          onChange={(e) => handleNameInputChange(e.target.value)}
                          onFocus={handleNameFocus}
                          onBlur={handleBlur}
                          placeholder="Full name"
                          className={`w-full pl-8 pr-2 py-2 bg-transparent rounded border transition-all duration-200 text-sm ${
                            errors.name
                              ? "border-red-500 focus:border-red-500"
                              : focusedInput === "name"
                              ? "border-emerald-500 focus:border-emerald-500"
                              : "border-gray-200 dark:border-gray-600 focus:border-emerald-500"
                          } focus:outline-none focus:ring-1 focus:ring-emerald-500/20`}
                        />
                        <User className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        <AnimatePresence>
                          {focusedInput === "name" && nameSuggestions.length > 0 && (
                            <motion.ul
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-full mt-1 max-h-32 overflow-y-auto"
                            >
                              {nameSuggestions.map((user, idx) => (
                                <motion.li
                                  key={idx}
                                  whileHover={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                  className="px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-xs"
                                  onMouseDown={() => handleSuggestionClick(user)}
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
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Date & Payment Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Date Selection */}
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
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Date</h3>
                  </div>

                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-2 py-2 bg-transparent dark:bg-transparent rounded border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                  />
                </motion.div>

                {/* ✅ Payment Method - UPDATED WITH PASS */}
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
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Payment</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_TYPES.map((type) => (
                      <motion.button
                        key={type}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setPaymentType(type);
                          if (type !== "Pass") {
                            setPassUid("");
                            setValidatedPass(null);
                            setPassError("");
                          }
                          if (errors.payment) {
                            setErrors((prev) => ({ ...prev, payment: "" }));
                          }
                        }}
                        className={`p-2 rounded border transition-all duration-200 text-xs ${
                          paymentType === type
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {type === 'Cash' ? (
                            <Wallet className="w-3 h-3" />
                          ) : type === 'UPI' ? (
                            <CreditCard className="w-3 h-3" />
                          ) : (
                            <Ticket className="w-3 h-3" />
                          )}
                          <span className="font-medium">{type}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* ✅ Pass UID Input - Shows when Pass is selected */}
                  <AnimatePresence>
                    {paymentType === "Pass" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-2"
                      >
                        <div className="relative">
                          <input
                            type="text"
                            value={passUid}
                            onChange={(e) => setPassUid(e.target.value.toUpperCase())}
                            onBlur={() => {
                              if (passUid.trim()) {
                                validatePass(passUid);
                              }
                            }}
                            placeholder="Enter Pass UID (HFG-XXXXXXXXXXXX)"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 text-sm"
                          />
                          {isValidatingPass && (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 absolute right-3 top-2.5" />
                          )}
                        </div>

                        {/* Validated Pass Details */}
                        {validatedPass && !passError && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 border border-emerald-200 dark:border-emerald-700"
                          >
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 text-xs space-y-1">
                                <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                                  {validatedPass.pass_name}
                                </p>
                                <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                                  <span>Hours Available:</span>
                                  <span className="font-bold">
                                    {validatedPass.remaining_hours} / {validatedPass.total_hours}
                                  </span>
                                </div>
                                {selectedSlots.length > 0 && (
                                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                    <span>Hours Needed:</span>
                                    <span className="font-bold">{calculateHoursForSlots()} hrs</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Error Message */}
                        {passError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-500 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            {passError}
                          </motion.p>
                        )}

                        {errors.pass && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-red-500"
                          >
                            {errors.pass}
                          </motion.p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Time Slots */}
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
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Time Slots</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-gray-600 dark:text-gray-400">Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                      <span className="text-gray-600 dark:text-gray-400">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-300 rounded-full" />
                      <span className="text-gray-600 dark:text-gray-400">Booked</span>
                    </div>
                  </div>
                </div>

                <div className="bg-transparent dark:bg-transparent rounded p-2">
                  {isLoadingSlots ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-600" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">Loading time slots...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-3 text-gray-500 dark:text-gray-400">
                      <Clock className="w-5 h-5 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No available slots</p>
                      <p className="text-xs mt-1">Try a different date</p>
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
                              ? 'bg-emerald-500 text-white shadow-sm transform scale-105'
                              : slot.is_available
                              ? 'bg-transparent dark:bg-transparent border border-gray-200 dark:border-gray-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed opacity-60'
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
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded"
                      >
                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">Selected:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedSlots.map((slotId) => {
                            const slot = availableSlots.find((s) => s.slot_id === slotId);
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
              {/* Booking Summary */}
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
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Summary</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Console:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedConsole.name}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedConsole.type}</span>
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
                    <span className="font-medium text-gray-800 dark:text-white">₹{consolePrice}/slot</span>
                  </div>

                  {/* ✅ Payment Method in Summary */}
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {paymentType}
                      {paymentType === "Pass" && validatedPass && (
                        <span className="text-xs text-emerald-600 ml-1">
                          (✓ Verified)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* ✅ Show hours deduction for Pass payment */}
                  {paymentType === "Pass" && validatedPass && selectedSlots.length > 0 && (
                    <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2">
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                        Hours to Deduct:
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {calculateHoursForSlots()} hrs
                      </span>
                    </div>
                  )}

                  {paymentType !== "Pass" && (
                    <>
                      <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Manual Waive Off:</span>
                        <input
                          type="number"
                          value={waiveOffAmount}
                          onChange={(e) => setWaiveOffAmount(Number(e.target.value))}
                          placeholder="₹0"
                          className="w-16 text-right px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-transparent text-gray-800 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors text-xs"
                          min={0}
                        />
                      </div>

                      {autoWaiveOffAmount > 0 && (
                        <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20 rounded px-2">
                          <span className="text-orange-600 dark:text-orange-400 font-medium">⏰ Auto Waive Off:</span>
                          <div className="text-right">
                            <span className="font-bold text-orange-600 dark:text-orange-400">₹{Math.round(autoWaiveOffAmount)}</span>
                            <div className="text-xs text-orange-500 dark:text-orange-300">
                              (Time-based discount)
                            </div>
                          </div>
                        </div>
                      )}

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
                    </>
                  )}

                  {/* Meals Selection */}
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Meals & Extras:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMealSelectorOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs hover:from-emerald-200 hover:to-green-200 dark:hover:from-emerald-900/50 dark:hover:to-green-900/50 transition-all duration-200 border border-emerald-200 dark:border-emerald-700"
                      >
                        <Plus className="w-3 h-3" />
                        {selectedMeals.length === 0 ? 'Add Meals' : `${selectedMeals.length} Selected`}
                      </button>
                    </div>
                  </div>

                  {/* Display selected meals */}
                  {selectedMeals.length > 0 && (
                    <div className="py-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="space-y-2">
                        {selectedMeals.map(meal => (
                          <div key={meal.menu_item_id} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="font-medium text-emerald-800 dark:text-emerald-200 text-xs">
                                  {meal.name}
                                </span>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                  {meal.category} • ₹{meal.price} × {meal.quantity}
                                </div>
                              </div>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                                ₹{meal.total}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="text-right pt-1 border-t border-emerald-200 dark:border-emerald-700">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Meals Total: ₹{mealsTotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentType !== "Pass" && (
                    <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded px-2">
                      <span className="font-bold text-gray-800 dark:text-white text-sm">Total:</span>
                      <span className="font-bold text-lg text-emerald-600">₹{totalAmount}</span>
                    </div>
                  )}

                  {paymentType === "Pass" && (
                    <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded px-2">
                      <span className="font-bold text-gray-800 dark:text-white text-sm">Payment:</span>
                      <span className="font-bold text-lg text-emerald-600">Pass (No charge)</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className={`w-full py-2.5 rounded-lg font-bold text-white transition-all duration-200 shadow-md ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:shadow-lg'
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
                {paymentType === "Pass" 
                  ? `Complete Booking - ${calculateHoursForSlots()} hrs`
                  : `Complete Booking - ₹${totalAmount}`
                }
              </div>
            )}
          </motion.button>
        </form>
      </div>

      {/* MealSelector */}
      <MealSelector
        vendorId={vendorId || 0}
        isOpen={isMealSelectorOpen}
        onClose={handleMealSelectorClose}
        onConfirm={handleMealSelectorConfirm}
        initialSelectedMeals={selectedMeals}
      />
    </div>
  );
};

export default BookingForm;
