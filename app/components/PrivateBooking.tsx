// components/booking/PrivateBookingForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import {
  X,
  User,
  Mail,
  Phone,
  CalendarDays,
  Clock,
  IndianRupee,
  CheckCircle,
  Loader2,
  Plus,
  ChevronLeft,
  AlertCircle,
  TowerControl as GameController2,
} from 'lucide-react';
import { BOOKING_URL } from '@/src/config/env';
import { ConsoleType } from './types';
import MealSelector from './mealSelector';

interface PrivateBookingFormProps {
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

interface CustomerInfo {
  user_id?: number;
  name: string;
  email: string;
  phone: string;
}

const PrivateBookingForm: React.FC<PrivateBookingFormProps> = ({ onBack }) => {
  // Vendor ID
  const [vendorId, setVendorId] = useState<number | null>(null);

  // Customer Information
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
  });

  // User suggestions (auto-complete)
  const [userList, setUserList] = useState<Array<{ name: string; email: string; phone: string }>>([]);
  const [emailSuggestions, setEmailSuggestions] = useState<typeof userList>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<typeof userList>([]);
  const [nameSuggestions, setNameSuggestions] = useState<typeof userList>([]);
  const [focusedInput, setFocusedInput] = useState<string>('');

  // Game/Console Selection
  const [availableGames, setAvailableGames] = useState<ConsoleType[]>([]);
  const [selectedGame, setSelectedGame] = useState<ConsoleType | null>(null);

  // Date & Time
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffsetMs);
    return istTime.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [durationHours, setDurationHours] = useState<number>(3);

  // Pricing
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [waiveOffAmount, setWaiveOffAmount] = useState<number>(0);

  // Extras
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false);

  // Payment
  const PAYMENT_MODES = ['Cash', 'UPI', 'Pass'];
  const [paymentMode, setPaymentMode] = useState<string>('Cash');

  // Notes
  const [notes, setNotes] = useState<string>('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate totals
  const mealsTotal = selectedMeals.reduce((sum, meal) => sum + meal.total, 0);
  const slotCost = hourlyRate * durationHours;
  const totalAmount = Math.max(0, slotCost + mealsTotal - manualDiscount - waiveOffAmount);

  // Decode vendor ID from JWT
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      try {
        const decoded = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded.sub.id);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  // Fetch user list for autocomplete
  useEffect(() => {
    if (!vendorId) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setUserList(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [vendorId]);

  // Fetch available games
  useEffect(() => {
    if (!vendorId) return;

    const fetchGames = async () => {
      try {
        const response = await fetch(`${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`);
        const data = await response.json();

        const games: ConsoleType[] = data.games?.map((game: any) => ({
          type: game.console_name,
          name: game.console_name,
          id: game.id,
          price: game.console_price,
          icon: GameController2,
          color: 'grey',
          iconColor: '#10b981',
          description: `${game.console_name} Gaming`,
        })) || [];

        setAvailableGames(games);
      } catch (error) {
        console.error('Error fetching games:', error);
      }
    };

    fetchGames();
  }, [vendorId]);

  // Auto-calculate duration when times change
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`${bookingDate}T${startTime}`);
      const end = new Date(`${bookingDate}T${endTime}`);

      if (end > start) {
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        setDurationHours(Math.round(hours * 2) / 2); // Round to nearest 0.5
      }
    }
  }, [startTime, endTime, bookingDate]);

  // Auto-complete handlers
  const getSuggestions = (key: keyof typeof userList[0], value: string) => {
    if (!value.trim()) return [];
    return userList.filter((user) =>
      user[key].toLowerCase().includes(value.toLowerCase())
    );
  };

  const handleEmailChange = (value: string) => {
    setCustomerInfo((prev) => ({ ...prev, email: value }));
    setEmailSuggestions(getSuggestions('email', value));
    setFocusedInput('email');
  };

  const handlePhoneChange = (value: string) => {
    setCustomerInfo((prev) => ({ ...prev, phone: value }));
    setPhoneSuggestions(getSuggestions('phone', value));
    setFocusedInput('phone');
  };

  const handleNameChange = (value: string) => {
    setCustomerInfo((prev) => ({ ...prev, name: value }));
    setNameSuggestions(getSuggestions('name', value));
    setFocusedInput('name');
  };

  const handleSuggestionClick = (user: typeof userList[0]) => {
    setCustomerInfo({
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
    setEmailSuggestions([]);
    setPhoneSuggestions([]);
    setNameSuggestions([]);
    setFocusedInput('');
  };

  // Meal selector handlers
  const handleMealSelectorConfirm = (meals: SelectedMeal[]) => {
    setSelectedMeals(meals);
    setIsMealSelectorOpen(false);
  };

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerInfo.name.trim()) newErrors.name = 'Name is required';
    if (!customerInfo.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(customerInfo.email)) newErrors.email = 'Email is invalid';
    if (!customerInfo.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!selectedGame) newErrors.game = 'Please select a game type';
    if (!bookingDate) newErrors.date = 'Booking date is required';
    if (!startTime || !endTime) newErrors.time = 'Start and end time are required';
    if (durationHours <= 0) newErrors.duration = 'Duration must be greater than 0';
    if (!paymentMode) newErrors.payment = 'Please select payment mode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !vendorId || !selectedGame) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${BOOKING_URL}/api/booking/private`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_id: vendorId,
          user_info: customerInfo,
          game_id: selectedGame.id,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          duration_hours: durationHours,
          hourly_rate: hourlyRate || selectedGame.price || 0,
          extra_services: selectedMeals.map((meal) => ({
            item_id: meal.menu_item_id,
            quantity: meal.quantity,
          })),
          payment_mode: paymentMode,
          manual_discount: manualDiscount,
          waive_off_amount: waiveOffAmount,
          notes: notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSubmitted(true);

        // Emit dashboard refresh event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating private booking:', error);
      alert('Failed to create private booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (isSubmitted) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center"
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
            Private Booking Created!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
            Booking for <span className="font-semibold text-emerald-600">{customerInfo.name}</span> has been successfully created.
          </p>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 mb-4 text-xs text-left">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Game Type</span>
              <span className="font-medium text-gray-800 dark:text-white">{selectedGame?.name}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Date</span>
              <span className="font-medium text-gray-800 dark:text-white">{bookingDate}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Time</span>
              <span className="font-medium text-gray-800 dark:text-white">{startTime} - {endTime}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Duration</span>
              <span className="font-medium text-gray-800 dark:text-white">{durationHours} hrs</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Payment</span>
              <span className="font-medium text-gray-800 dark:text-white">{paymentMode}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
              <span className="font-bold text-emerald-600 text-lg">₹{totalAmount}</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-green-700 shadow-md transition-all duration-200"
          >
            Create Another Booking
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Private Booking
            </h1>
            <p className="text-xs text-gray-500">Manual booking without slot restrictions</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-purple-100/50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
          <GameController2 className="w-4 h-4 text-purple-600 dark:text-purple-300" />
          <span className="text-purple-700 dark:text-purple-300 font-medium text-sm">Private Mode</span>
        </div>
      </motion.div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left Column - Customer & Game */}
            <div className="lg:col-span-2 space-y-3">
              {/* Customer Details */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Customer Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Email with autocomplete */}
                  <div className="relative">
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setTimeout(() => setFocusedInput(''), 150)}
                      placeholder="Email"
                      className={`w-full pl-8 pr-2 py-2 bg-white dark:bg-gray-900 rounded border transition-all duration-200 text-sm ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500'
                          : focusedInput === 'email'
                          ? 'border-blue-500 focus:border-blue-500'
                          : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500/20`}
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />

                    {/* Email suggestions */}
                    <AnimatePresence>
                      {focusedInput === 'email' && emailSuggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-full mt-1 max-h-32 overflow-y-auto"
                        >
                          {emailSuggestions.map((user, idx) => (
                            <li
                              key={idx}
                              className="px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-xs"
                              onMouseDown={() => handleSuggestionClick(user)}
                            >
                              <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Phone with autocomplete */}
                  <div className="relative">
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onFocus={() => setFocusedInput('phone')}
                      onBlur={() => setTimeout(() => setFocusedInput(''), 150)}
                      placeholder="Phone"
                      className={`w-full pl-8 pr-2 py-2 bg-white dark:bg-gray-900 rounded border transition-all duration-200 text-sm ${
                        errors.phone
                          ? 'border-red-500 focus:border-red-500'
                          : focusedInput === 'phone'
                          ? 'border-blue-500 focus:border-blue-500'
                          : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500/20`}
                    />
                    <Phone className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />

                    {/* Phone suggestions */}
                    <AnimatePresence>
                      {focusedInput === 'phone' && phoneSuggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-full mt-1 max-h-32 overflow-y-auto"
                        >
                          {phoneSuggestions.map((user, idx) => (
                            <li
                              key={idx}
                              className="px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-xs"
                              onMouseDown={() => handleSuggestionClick(user)}
                            >
                              <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                              <p className="text-gray-600 dark:text-gray-400">{user.phone}</p>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Name with autocomplete */}
                  <div className="relative">
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setTimeout(() => setFocusedInput(''), 150)}
                      placeholder="Full Name"
                      className={`w-full pl-8 pr-2 py-2 bg-white dark:bg-gray-900 rounded border transition-all duration-200 text-sm ${
                        errors.name
                          ? 'border-red-500 focus:border-red-500'
                          : focusedInput === 'name'
                          ? 'border-blue-500 focus:border-blue-500'
                          : 'border-gray-200 dark:border-gray-600 focus:border-blue-500'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500/20`}
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />

                    {/* Name suggestions */}
                    <AnimatePresence>
                      {focusedInput === 'name' && nameSuggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-full mt-1 max-h-32 overflow-y-auto"
                        >
                          {nameSuggestions.map((user, idx) => (
                            <li
                              key={idx}
                              className="px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-xs"
                              onMouseDown={() => handleSuggestionClick(user)}
                            >
                              <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Game Selection */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <GameController2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Select Game Type</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableGames.map((game) => (
                    <motion.button
                      key={game.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedGame(game);
                        setHourlyRate(game.price || 0);
                        if (errors.game) setErrors((prev) => ({ ...prev, game: '' }));
                      }}
                      className={`p-3 rounded-lg border transition-all duration-200 text-sm ${
                        selectedGame?.id === game.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <GameController2 className="w-5 h-5" />
                        <span className="font-medium">{game.name}</span>
                        <span className="text-xs text-gray-500">₹{game.price}/hr</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
                {errors.game && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-xs text-red-500"
                  >
                    {errors.game}
                  </motion.p>
                )}
              </motion.div>

              {/* Date & Time */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                    <CalendarDays className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Schedule</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-2 py-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2 py-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2 py-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Duration (hrs)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                      className="w-full px-2 py-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all duration-200 text-sm"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Extras & Notes */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                    <Plus className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Extras & Notes</h3>
                </div>

                <div className="space-y-3">
                  {/* Meals */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsMealSelectorOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs hover:from-orange-200 hover:to-red-200 dark:hover:from-orange-900/50 dark:hover:to-red-900/50 transition-all duration-200"
                    >
                      <Plus className="w-3 h-3" />
                      {selectedMeals.length === 0 ? 'Add Meals/Snacks' : `${selectedMeals.length} Selected`}
                    </button>

                    {/* Display selected meals */}
                    {selectedMeals.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selectedMeals.map((meal) => (
                          <div key={meal.menu_item_id} className="bg-orange-50 dark:bg-orange-900/20 rounded p-2 text-xs">
                            <div className="flex justify-between">
                              <span className="font-medium">{meal.name}</span>
                              <span className="font-bold text-orange-600">₹{meal.total}</span>
                            </div>
                            <div className="text-gray-500">
                              {meal.quantity} × ₹{meal.price}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any special instructions..."
                      rows={2}
                      className="w-full px-2 py-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-all duration-200 text-sm resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                    <IndianRupee className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Summary</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Game</span>
                    <span className="font-medium">{selectedGame?.name || '-'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Duration</span>
                    <span className="font-medium">{durationHours} hrs</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Hourly Rate</span>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-16 text-right px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                      min="0"
                    />
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Slot Cost</span>
                    <span className="font-medium">₹{slotCost}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Meals/Extras</span>
                    <span className="font-medium">₹{mealsTotal}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Manual Discount</span>
                    <input
                      type="number"
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(Number(e.target.value))}
                      placeholder="0"
                      className="w-16 text-right px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                      min="0"
                    />
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Waive Off</span>
                    <input
                      type="number"
                      value={waiveOffAmount}
                      onChange={(e) => setWaiveOffAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-16 text-right px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs"
                      min="0"
                    />
                  </div>

                  <div className="flex justify-between py-2 bg-purple-50 dark:bg-purple-900/30 rounded px-2">
                    <span className="font-bold text-gray-800 dark:text-white text-sm">Total</span>
                    <span className="font-bold text-lg text-purple-600">₹{totalAmount}</span>
                  </div>
                </div>
              </motion.div>

              {/* Payment Mode */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                    <IndianRupee className="w-4 h-4 text-yellow-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Payment Mode</h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`p-2 rounded border transition-all duration-200 text-xs ${
                        paymentMode === mode
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-yellow-300 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-lg font-bold text-white transition-all duration-200 shadow-md ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Private Booking...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Create Private Booking - ₹{totalAmount}
              </div>
            )}
          </motion.button>
        </form>
      </div>

      {/* Meal Selector Modal */}
      <MealSelector
        vendorId={vendorId || 0}
        isOpen={isMealSelectorOpen}
        onClose={() => setIsMealSelectorOpen(false)}
        onConfirm={handleMealSelectorConfirm}
        initialSelectedMeals={selectedMeals}
      />
    </div>
  );
};

export default PrivateBookingForm;
