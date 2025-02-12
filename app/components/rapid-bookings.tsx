"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Gamepad2, Gamepad, Headset, Search, Clock, Phone, User, CreditCard, Filter, X, ChevronDown, Wallet, GamepadIcon, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

type Platform = 'PC' | 'PS5' | 'XBOX' | 'VR';
type TimeSlot = { time: string; available: boolean };
type SystemStatus = 'available' | 'occupied' | 'maintenance';

interface System {
  id: string;
  type: Platform;
  name: string;
  icon: JSX.Element;
  price: string;
  status: SystemStatus;
  number: number;
}

function RapidBookings() {
  const [name, setName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [paymentType, setPaymentType] = useState("")
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [consoleType, setConsoleType] = useState("")
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    price: 'all'
  });
  const [activeFilters, setActiveFilters] = useState(0);

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (name.length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!/^\d{10}$/.test(contactNumber)) {
      newErrors.contactNumber = "Please enter a valid 10-digit phone number"
    }

    if (!consoleType) {
      newErrors.consoleType = "Please select a console type"
    }

    if (!paymentType) {
      newErrors.paymentType = "Please select a payment type"
    }

    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!date || selectedDate < today) {
      newErrors.date = "Please select a valid future date"
    }

    if (!time) {
      newErrors.time = "Please select a time"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const systems: System[] = [
    { id: 'pc1', type: 'PC', name: 'Gaming PC', icon: <Monitor className="w-6 h-6" />, price: '₹60/hr', status: 'available', number: 1 },
    { id: 'pc2', type: 'PC', name: 'Gaming PC', icon: <Monitor className="w-6 h-6" />, price: '₹60/hr', status: 'occupied', number: 2 },
    { id: 'pc3', type: 'PC', name: 'Gaming PC', icon: <Monitor className="w-6 h-6" />, price: '₹60/hr', status: 'available', number: 3 },
    { id: 'ps1', type: 'PS5', name: 'PlayStation 5', icon: <Gamepad2 className="w-6 h-6" />, price: '₹80/hr', status: 'available', number: 1 },
    { id: 'ps2', type: 'PS5', name: 'PlayStation 5', icon: <Gamepad2 className="w-6 h-6" />, price: '₹80/hr', status: 'maintenance', number: 2 },
    { id: 'xbox1', type: 'XBOX', name: 'Xbox Series X', icon: <Gamepad className="w-6 h-6" />, price: '₹80/hr', status: 'available', number: 1 },
    { id: 'xbox2', type: 'XBOX', name: 'Xbox Series X', icon: <Gamepad className="w-6 h-6" />, price: '₹80/hr', status: 'occupied', number: 2 },
    { id: 'vr1', type: 'VR', name: 'VR Station', icon: <Headset className="w-6 h-6" />, price: '₹150/hr', status: 'available', number: 1 },
  ];

  const timeSlots: TimeSlot[] = [
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '12:00 PM', available: false },
    { time: '1:00 PM', available: true },
    { time: '2:00 PM', available: true },
    { time: '3:00 PM', available: false },
  ];

  useEffect(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.price !== 'all') count++;
    setActiveFilters(count);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      price: 'all'
    });
    setSearchQuery('');
  };

  const handleBook = (system: System) => {
    setSelectedSystem(system);
    setShowBookingForm(true);
  };

  const filteredSystems = systems.filter(system => {
    if (searchQuery && !system.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.type !== 'all' && system.type !== filters.type) return false;
    if (filters.status !== 'all' && system.status !== filters.status) return false;
    if (filters.price === 'low' && parseInt(system.price) > 60) return false;
    if (filters.price === 'high' && parseInt(system.price) < 60) return false;
    return true;
  });

  const getStatusColor = (status: SystemStatus) => {
    switch (status) {
      case 'available': return 'text-[#098637]';
      case 'occupied': return 'text-red-500';
      case 'maintenance': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }


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
                      ? 'bg-[#098637] text-white hover:bg-[#076d2a]' 
                      : 'hover:border-[#098637] hover:text-[#098637]'
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
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Enhanced Filter Panel */}
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">System Type</Label>
                        <Select
                          value={filters.type}
                          onValueChange={(value) => setFilters({...filters, type: value})}
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#098637] focus:ring-[#098637]">
                            <SelectValue placeholder="All Systems" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Systems</SelectItem>
                            <SelectItem value="PC">PC</SelectItem>
                            <SelectItem value="PS5">PlayStation 5</SelectItem>
                            <SelectItem value="XBOX">Xbox Series X</SelectItem>
                            <SelectItem value="VR">VR Station</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                        <Select
                          value={filters.status}
                          onValueChange={(value) => setFilters({...filters, status: value as SystemStatus})}
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
                            <SelectItem value="maintenance">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                Maintenance
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Price Range</Label>
                        <Select
                          value={filters.price}
                          onValueChange={(value) => setFilters({...filters, price: value})}
                        >
                          <SelectTrigger className="w-full border-gray-200 focus:border-[#098637] focus:ring-[#098637]">
                            <SelectValue placeholder="All Prices" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Prices</SelectItem>
                            <SelectItem value="low">Under ₹60/hr</SelectItem>
                            <SelectItem value="high">₹60/hr and above</SelectItem>
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
                          {filters.type !== 'all' && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#098637]/10 text-[#098637]"
                            >
                              Type: {filters.type}
                              <button
                                onClick={() => setFilters({...filters, type: 'all'})}
                                className="ml-2 hover:text-[#076d2a]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.span>
                          )}
                          {filters.status !== 'all' && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#098637]/10 text-[#098637]"
                            >
                              Status: {filters.status}
                              <button
                                onClick={() => setFilters({...filters, status: 'all'})}
                                className="ml-2 hover:text-[#076d2a]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.span>
                          )}
                          {filters.price !== 'all' && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#098637]/10 text-[#098637]"
                            >
                              Price: {filters.price === 'low' ? 'Under ₹60/hr' : '₹60/hr and above'}
                              <button
                                onClick={() => setFilters({...filters, price: 'all'})}
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
                  <span className="font-semibold text-[#098637]">{system.price}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{system.name} #{system.number}</h3>
                <p className={`mb-4 ${getStatusColor(system.status)} flex items-center gap-2`}>
                  <span className={`w-2 h-2 rounded-full ${
                    system.status === 'available' ? 'bg-[#098637]' :
                    system.status === 'occupied' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />
                  {system.status.charAt(0).toUpperCase() + system.status.slice(1)}
                </p>
                <Button
                  onClick={() => handleBook(system)}
                  disabled={system.status !== 'available'}
                  className={`w-full transition-all duration-300 ${
                    system.status === 'available'
                      ? 'bg-[#098637] hover:bg-[#076d2a] hover:scale-105'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {system.status === 'available' ? 'Book Now' : 'Unavailable'}
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
              <h2 className="text-2xl font-bold">Book {selectedSystem?.name} #{selectedSystem?.number}</h2>
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
                    <Input className="pl-9" placeholder="Enter your name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                    <Input className="pl-9" placeholder="Enter phone number" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {timeSlots.map((slot, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: slot.available ? 1.05 : 1 }}
                        whileTap={{ scale: slot.available ? 0.95 : 1 }}
                        type="button"
                        disabled={!slot.available}
                        className={`p-2 rounded-lg text-center transition-colors ${
                          slot.available
                            ? 'bg-[#098637] text-white hover:bg-[#076d2a]'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.div 
                  className="space-y-2"
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Label htmlFor="consoleType" className="text-sm font-medium flex items-center gap-1">
                    Console Type {errors.consoleType && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </Label>
                  <div className="relative">
                    <GamepadIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                    <Select value={consoleType} onValueChange={setConsoleType}>
                      <SelectTrigger 
                        id="consoleType" 
                        className={`pl-9 transition-all duration-200 ${
                          errors.consoleType ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
                          'border-gray-300 focus:border-[#098637] focus:ring-[#098637]'
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
                    className="w-full p-3 border rounded-lg text-gray-900 bg-white focus:ring-[#098637] focus:border-[#098637] transition-all duration-200"
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
                    type="submit"
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