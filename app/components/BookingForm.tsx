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

  // Fetch available slots when date or vendor/console changes
  useEffect(() => {
    if (!vendorId || !selectedConsole.id) return;
    
    const fetchAvailableSlots = async () => {
      try {
        const response = await fetch(
          `${BOOKING_URL}/api/getSlots/vendor/${vendorId}/game/${selectedConsole.id}/${selectedDate.replace(/-/g, "")}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch slots");
        }
        
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (error) {
        console.error("Error fetching available slots:", error);
      }
    };

    fetchAvailableSlots();
  }, [vendorId, selectedDate, selectedConsole.id]);

  const handleSlotClick = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
    
    // Clear slot error if user selects a slot
    if (errors.slots) {
      setErrors(prev => ({...prev, slots: ""}));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    const bookingData = {
      consoleType: selectedConsole.type,
      name,
      email,
      phone,
      bookedDate: selectedDate,
      slotId: selectedSlots,
      paymentType,
    };

    try {
      const response = await fetch(
        `${BOOKING_URL}/api/newBooking/vendor/${vendorId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit booking");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If booking was successful, show confirmation
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center"
      >
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20 
            }}
            className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4"
          >
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-800">Booking Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your booking for {selectedConsole.name} has been successfully created.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Make Another Booking
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
          <span className="ml-1 text-gray-600">Back</span>
        </button>
        <h2 className="text-xl md:text-2xl font-bold mx-auto pr-10 text-center text-emerald-600">
          Book {selectedConsole.name} Console
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - User Information */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              
              <div className="space-y-4">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    } focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors dark:border-gray-700 dark:bg-gray-800`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 absolute ml-3" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                        errors.email ? "border-red-500" : "border-gray-300"
                      } focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors dark:border-gray-700 dark:bg-gray-800`}
                      placeholder="your-email@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 absolute ml-3" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                        errors.phone ? "border-red-500" : "border-gray-300"
                      } focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors dark:border-gray-700 dark:bg-gray-800`}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="font-medium flex items-center gap-2 text-emerald-800">
                    <Wallet className="w-5 h-5" />
                    Total Amount: ${selectedSlots.length * 100}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {['Cash', 'Online'].map(type => (
                      <motion.button
                        key={type}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setPaymentType(type);
                          if (errors.payment) {
                            setErrors(prev => ({...prev, payment: ""}));
                          }
                        }}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${
                          paymentType === type
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {type === 'Cash' ? (
                          <div className="flex items-center justify-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Cash
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Online
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  {errors.payment && (
                    <p className="mt-1 text-sm text-red-500">{errors.payment}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Details */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Date & Time
              </h3>
              
              <div className="space-y-4">
                {/* Date Selector */}
                <div>
                  <label htmlFor="bookingDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Date
                  </label>
                  <input
                    id="bookingDate"
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                {/* Time Slots */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Available Time Slots
                    </label>
                    <div className="flex items-center text-sm">
                      <span className="flex items-center mr-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full mr-1"></div>
                        <span className="text-gray-600">Selected</span>
                      </span>
                      <span className="flex items-center">
                        <div className="w-3 h-3 bg-red-200 rounded-full mr-1"></div>
                        <span className="text-gray-600">Unavailable</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                    {availableSlots.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p>No available slots for this date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 ">
                        {availableSlots.map((slot) => (
                          <motion.button
                            key={slot.slot_id}
                            type="button"
                            whileHover={{ scale: slot.is_available ? 1.05 : 1 }}
                            whileTap={{ scale: slot.is_available ? 0.95 : 1 }}
                            onClick={() => {
                              if (slot.is_available) {
                                handleSlotClick(slot.slot_id);
                              }
                            }}
                            disabled={!slot.is_available}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                              selectedSlots.includes(slot.slot_id)
                                ? "bg-emerald-500 text-white shadow-sm"
                                : slot.is_available
                                ? "bg-white border border-gray-200 dark:border-gray-700	dark:bg-gray-900 hover:bg-emerald-50 hover:border-emerald-200"
                                : "bg-red-100 text-red-400 cursor-not-allowed opacity-60"
                            }`}
                          >
                            {slot.start_time.slice(0, 5)}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    {errors.slots && (
                      <p className="mt-3 text-sm text-red-500">{errors.slots}</p>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected slots: <span className="font-medium">{selectedSlots.length}</span>
                  </p>
                  {selectedSlots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSlots.map(slotId => {
                        const slot = availableSlots.find(s => s.slot_id === slotId);
                        return (
                          <div key={slotId} className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm flex items-center">
                            {slot?.start_time.slice(0, 5)}
                            <button 
                              type="button"
                              onClick={() => handleSlotClick(slotId)}
                              className="ml-1 text-emerald-600 hover:text-emerald-800"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-emerald-600">
                Booking Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Console Type:</span>
                  <span className="font-medium">{selectedConsole.name}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : ''}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Number of Slots:</span>
                  <span className="font-medium">{selectedSlots.length}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Cost per Slot:</span>
                  <span className="font-medium">$100</span>
                </div>
                
                <div className="flex justify-between py-2 text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-emerald-600">${selectedSlots.length * 100}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-200">
          <motion.button
            type="submit"
            whileHover={{ scale: isSubmitting ? 1 : 1.03 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
              isSubmitting 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-700 shadow-md"
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Booking...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Complete Booking
              </div>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;