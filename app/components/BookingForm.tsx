import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import { 
  X, User, Mail, Phone, Calendar, CreditCard, 
  Clock, Wallet, ChevronLeft, CheckCircle, Loader2 
} from 'lucide-react';
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
  
  // Booking details
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
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

  // Fetch user details from Redis
  const fetchUserDetails = async (identifier: string) => {
    setIsLoadingUser(true);
    try {
      const response = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier,
          redisUrl: 'rediss://red-d0hpfdidbo4c73dicadg:pKfNIbBN5g1GkX9RKZxig4yE9bQBRhdu@singapore-keyvalue.render.com:6379'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setPhone(data.user.phone || '');
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Handle input changes with Redis lookup
  const handleInputChange = async (value: string, type: 'email' | 'phone') => {
    if (type === 'email') {
      setEmail(value);
      if (value.includes('@')) {
        await fetchUserDetails(value);
      }
    } else {
      setPhone(value);
      if (value.length >= 10) {
        await fetchUserDetails(value);
      }
    }
  };

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

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      try {
        const decoded = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded.sub.id);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

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
        setAvailableSlots(data.slots || []);
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
            name, email, phone,
            bookedDate: selectedDate,
            slotId: selectedSlots,
            paymentType,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to submit booking");
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6"
      >
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </motion.div>
          
          <h2 className="text-xl font-bold text-gray-800">Booking Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Your booking for {selectedConsole.name} has been successfully created.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
          >
            Make Another Booking
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-lg font-bold mx-auto pr-8 text-emerald-600">
          Book {selectedConsole.name}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-base font-semibold mb-3 text-emerald-600 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Details
              </h3>
              
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleInputChange(e.target.value, 'email')}
                    className={`w-full pl-9 pr-3 py-2 rounded-md border ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    } text-sm`}
                    placeholder="Email Address"
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handleInputChange(e.target.value, 'phone')}
                    className={`w-full pl-9 pr-3 py-2 rounded-md border ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    } text-sm`}
                    placeholder="Phone Number"
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                  )}
                </div>

                {isLoadingUser ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 rounded-md border ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      } text-sm`}
                      placeholder="Full Name"
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-base font-semibold mb-3 text-emerald-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Select Date
              </h3>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-base font-semibold mb-3 text-emerald-600 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </h3>
              <div className="grid grid-cols-2 gap-3">
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
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      paymentType === type
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-gray-100  text-gray-800 hover:bg-gray-200 "
                    }`}
                  >
                    {type === 'Cash' ? (
                      <div className="flex items-center justify-center gap-1">
                        <Wallet className="w-4 h-4" />
                        Cash
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        Online
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              {errors.payment && (
                <p className="mt-1 text-xs text-red-500">{errors.payment}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-emerald-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Slots
                </h3>
                <div className="flex items-center text-xs">
                  <span className="flex items-center mr-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>
                    <span className="text-gray-600 dark:text-gray-400">Selected</span>
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-red-200 rounded-full mr-1"></div>
                    <span className="text-gray-600 dark:text-gray-400">Unavailable</span>
                  </span>
                </div>
              </div>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                {availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    <Clock className="w-5 h-5 mx-auto mb-1 opacity-50" />
                    <p>No available slots</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
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
                        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                          selectedSlots.includes(slot.slot_id)
                            ? "bg-emerald-500 text-white shadow-sm"
                            : slot.is_available
                            ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 hover:border-emerald-200"
                            : "bg-red-100 text-red-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {slot.start_time.slice(0, 5)}
                      </motion.button>
                    ))}
                  </div>
                )}
                {errors.slots && (
                  <p className="mt-2 text-xs text-red-500">{errors.slots}</p>
                )}
              </div>

              {selectedSlots.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {selectedSlots.map(slotId => {
                      const slot = availableSlots.find(s => s.slot_id === slotId);
                      return (
                        <div key={slotId} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-xs flex items-center">
                          {slot?.start_time.slice(0, 5)}
                          <button 
                            type="button"
                            onClick={() => handleSlotClick(slotId)}
                            className="ml-1 text-emerald-600 hover:text-emerald-800"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-base font-semibold mb-3 text-emerald-600">
                Booking Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1  border-gray-100">
                  <span className="text-gray-600 dark:text-gray-400">Console:</span>
                  <span className="font-medium">{selectedConsole.name}</span>
                </div>
                <div className="flex justify-between py-1  border-gray-100">
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="font-medium">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1border-gray-100">
                  <span className="text-gray-600 dark:text-gray-400">Slots:</span>
                  <span className="font-medium">{selectedSlots.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                  <span className="font-medium">₹100/slot</span>
                </div>
                <div className="flex justify-between py-1 text-base">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{selectedSlots.length * 100}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          className={`w-full py-2 rounded-lg font-medium text-white transition-colors ${
            isSubmitting 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-emerald-600 hover:bg-emerald-700 shadow-sm"
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
              Complete Booking
            </div>
          )}
        </motion.button>
      </form>
    </div>
  );
};

export default BookingForm;