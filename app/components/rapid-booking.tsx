import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { User, Phone, Calendar, Clock, GamepadIcon, CreditCard, CheckCircle2, AlertCircle , Wallet} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


export function RapidBooking() {
  const [name, setName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [consoleType, setConsoleType] = useState("")
  const [paymentType, setPaymentType] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast({
        title: "Booking Successful!",
        description: "Your gaming session has been booked. Check your email for confirmation.",
        duration: 5000
      })
      // Reset form
      setName("")
      setContactNumber("")
      setConsoleType("")
      setPaymentType("")
      setDate("")
      setTime("")
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto p-4"
    >
      <Card className="border-2 hover:border-[#098637] transition-all duration-300 shadow-lg hover:shadow-xl">
        <CardHeader className="space-y-1">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <CardTitle className="text-3xl font-bold text-center text-[#098637]">Quick Booking</CardTitle>
            <p className="text-center text-sm text-gray-500 mt-2">Book your gaming session in minutes</p>
          </motion.div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                className="space-y-2"
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
              >
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1">
                  Name {errors.name && <AlertCircle className="h-4 w-4 text-red-500" />}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`pl-9 transition-all duration-200 ${
                      errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
                      'border-gray-300 focus:border-[#098637] focus:ring-[#098637]'
                    }`}
                    placeholder="Enter your name"
                  />
                </div>
                {errors.name && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-xs text-red-500 mt-1"
                  >
                    {errors.name}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                <Label htmlFor="contactNumber" className="text-sm font-medium flex items-center gap-1">
                  Contact Number {errors.contactNumber && <AlertCircle className="h-4 w-4 text-red-500" />}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input 
                    id="contactNumber"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`pl-9 transition-all duration-200 ${
                      errors.contactNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
                      'border-gray-300 focus:border-[#098637] focus:ring-[#098637]'
                    }`}
                    placeholder="Enter phone number"
                    maxLength={10}
                  />
                </div>
                {errors.contactNumber && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-xs text-red-500 mt-1"
                  >
                    {errors.contactNumber}
                  </motion.p>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Payment Type
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                className="space-y-2"
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.5 }}
              >
                <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1">
                  Date {errors.date && <AlertCircle className="h-4 w-4 text-red-500" />}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input 
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`pl-9 transition-all duration-200 ${
                      errors.date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
                      'border-gray-300 focus:border-[#098637] focus:ring-[#098637]'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
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
              </motion.div>

              <motion.div 
                className="space-y-2"
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.6 }}
              >
                <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1">
                  Time {errors.time && <AlertCircle className="h-4 w-4 text-red-500" />}
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input 
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={`pl-9 transition-all duration-200 ${
                      errors.time ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 
                      'border-gray-300 focus:border-[#098637] focus:ring-[#098637]'
                    }`}
                    min="09:00"
                    max="22:00"
                  />
                </div>
                {errors.time && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-xs text-red-500 mt-1"
                  >
                    {errors.time}
                  </motion.p>
                )}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="pt-4"
            >
              <Button 
                type="submit"
                className={`w-full transition-all duration-300 ${
                  isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-[#098637] hover:bg-[#076d2a] hover:shadow-lg'
                }`}
                disabled={isSubmitting}
              >
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.div 
                      key="submitting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="submit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center space-x-2"
                    >
                      <span>Book Now</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}