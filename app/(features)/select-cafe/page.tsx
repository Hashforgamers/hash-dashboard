"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Store, Lock, Unlock, Plus, X } from "lucide-react"
import { LOGIN_URL, VENDOR_ONBOARD_URL } from "@/src/config/env"
import { toast } from "sonner"

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export default function SelectCafePage() {
  const [cafes, setCafes] = useState<{ id: string; name: string; type: string }[]>([])
  const [selectedCafe, setSelectedCafe] = useState<string | null>(null)
  const [pin, setPin] = useState("")
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showOnboardDialog, setShowOnboardDialog] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Onboarding Form State
  const [formData, setFormData] = useState({
    cafe_name: "",
    owner_name: "",
    vendor_account_email: "", // Will be auto-filled
    vendor_pin: "",
    vendor_password: "",
    contact_info: {
      email: "",
      phone: "",
      website: "",
    },
    physicalAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
    },
    business_registration_details: {
      registration_number: "",
      business_type: "Gaming Cafe",
      tax_id: "",
    },
    timing: {} as Record<string, { open: string; close: string; closed: boolean }>,
    opening_day: new Date().toISOString().split("T")[0],
    available_games: [{ name: "", total_slot: 0, rate_per_slot: 0, gaming_type: "PC" }],
    document_submitted: {
      business_registration: false,
      owner_identification_proof: false,
      tax_identification_number: false,
      bank_acc_details: false,
    },
  })

  const [documents, setDocuments] = useState<Record<string, File | null>>({
    business_registration: null,
    owner_identification_proof: null,
    tax_identification_number: null,
    bank_acc_details: null,
  })

  useEffect(() => {
    const storedVendors = localStorage.getItem("vendors")
    const userEmail = localStorage.getItem("vendor_account_email") || localStorage.getItem("vendor_login_email")

    // Auto-fill parent email
    if (userEmail) {
      setFormData((prev) => ({
        ...prev,
        vendor_account_email: userEmail,
      }))
    }

    // Initialize timing for all days
    const initialTiming: Record<string, { open: string; close: string; closed: boolean }> = {}
    DAYS_OF_WEEK.forEach((day) => {
      initialTiming[day] = { open: "09:00", close: "22:00", closed: false }
    })
    setFormData((prev) => ({ ...prev, timing: initialTiming }))

    if (storedVendors) {
      try {
        const parsed = JSON.parse(storedVendors)
        if (Array.isArray(parsed)) {
          const loadedCafes = parsed.map((vendor: any) => ({
            id: String(vendor.id),
            name: vendor.cafe_name.trim(),
            type: "store",
          }))
          setCafes(loadedCafes)
        } else {
          setCafes([])
        }
      } catch (error) {
        console.error("Failed to parse vendors from localStorage", error)
        setCafes([])
      }
    } else {
      setCafes([])
    }
  }, [])

  const handleCafeClick = (id: string) => {
    if (id === "add-new") {
      setShowOnboardDialog(true)
      return
    }
    setSelectedCafe(id)
    setShowPinDialog(true)
    setPin("")
    setError(null)
  }

  const selectedCafeData = cafes.find((cafe) => cafe.id === selectedCafe)

  const convertTo12HourFormat = (time24: string): string | null => {
    if (!time24 || time24 === "") return null

    try {
      const [hours, minutes] = time24.split(":")
      const hour = parseInt(hours, 10)

      if (isNaN(hour) || hour < 0 || hour > 23) {
        console.error("Invalid hour:", hours)
        return null
      }

      const period = hour >= 12 ? "PM" : "AM"
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const paddedHour = hour12.toString().padStart(2, "0") // ✅ Zero-padded

      return `${paddedHour}:${minutes} ${period}`
    } catch (error) {
      console.error("Error converting time:", time24, error)
      return null
    }
  }

  const handleOnboardSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validation
      if (!formData.cafe_name || !formData.owner_name || !formData.contact_info.email) {
        toast.error("Please fill all required fields")
        setIsSubmitting(false)
        return
      }

      // Convert timing to 12-hour format
      const timing12Hour: Record<string, { open: string; close: string; closed: boolean }> = {}
      for (const day of DAYS_OF_WEEK) {
        const dayTiming = formData.timing[day]
        timing12Hour[day] = {
          open: dayTiming.closed ? "" : convertTo12HourFormat(dayTiming.open) || "",
          close: dayTiming.closed ? "" : convertTo12HourFormat(dayTiming.close) || "",
          closed: dayTiming.closed,
        }
      }

      // Prepare form data
      const formDataToSend = new FormData()

      const jsonData = {
        ...formData,
        timing: timing12Hour,
      }

      formDataToSend.append("json", JSON.stringify(jsonData))

      // Append documents
      Object.entries(documents).forEach(([key, file]) => {
        if (file && formData.document_submitted[key as keyof typeof formData.document_submitted]) {
          formDataToSend.append(key, file)
        }
      })

      const response = await fetch(`${VENDOR_ONBOARD_URL}/api/onboard`, {
        method: "POST",
        body: formDataToSend,
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Cafe onboarded successfully!")
        setShowOnboardDialog(false)
        // Refresh cafe list
        window.location.reload()
      } else {
        toast.error(result.message || "Onboarding failed")
        setError(result.message || "Onboarding failed")
      }
    } catch (err) {
      console.error("Onboarding error:", err)
      toast.error("Failed to onboard cafe")
      setError("Failed to onboard cafe. Please try again.")
    }

    setIsSubmitting(false)
  }

  const handleUnlock = async () => {
    if (isSubmitting) return

    setError(null)
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError("Please enter a valid 4-digit PIN.")
      triggerShake()
      return
    }

    if (!selectedCafeData) {
      setError("No cafe selected.")
      return
    }

    setIsSubmitting(true)
    setIsUnlocking(true)

    try {
      const timestamp = Date.now()
      const validateUrl = `${LOGIN_URL}/api/validatePin?t=${timestamp}`
      const response = await fetch(validateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendor_id: selectedCafeData.id,
          pin,
          timestamp,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.status === "success") {
        localStorage.setItem("selectedCafe", selectedCafeData.id)
        localStorage.setItem("jwtToken", data.data.token)

        const oneHour = 60 * 60
        document.cookie = `jwt=${data.data.token}; max-age=${oneHour}; path=/; SameSite=Lax; Secure`

        toast.success("Access granted!")
        router.replace("/dashboard")
      } else {
        setError(data.message || "Invalid PIN, please try again.")
        triggerShake()
      }
    } catch (err) {
      console.error("PIN validation error:", err)
      setError("Network error. Please try again.")
      triggerShake()
    }

    setIsUnlocking(false)
    setIsSubmitting(false)
  }

  function triggerShake() {
    const input = document.querySelector('input[type="password"]')
    input?.classList.add("animate-shake")
    setTimeout(() => input?.classList.remove("animate-shake"), 500)
  }

  const handleFileChange = (docType: string, file: File | null) => {
    setDocuments((prev) => ({ ...prev, [docType]: file }))
    if (file) {
      setFormData((prev) => ({
        ...prev,
        document_submitted: { ...prev.document_submitted, [docType]: true },
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl w-full flex flex-col items-center gap-8 md:gap-12 z-20">
        {/* Header Section */}
        <div className="text-center space-y-4 md:space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold md:mb-2 bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent tracking-tight select-none">
            Select Gaming Cafe
          </h1>

          <p className="text-slate-400 text-lg md:text-lg max-w-2xl mx-auto leading-relaxed select-none">
            Choose your cafe and enter your PIN to unlock the dashboard.
          </p>
        </div>

        {/* Cafe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl">
          {cafes.map((cafe, index) => (
            <div
              key={cafe.id}
              className="group relative"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: "fadeInUp 0.6s ease-out forwards",
              }}
            >
              <button
                onClick={() => handleCafeClick(cafe.id)}
                className="relative w-full p-6 md:p-8 rounded-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-slate-700 to-slate-800 shadow-xl shadow-slate-900/30 hover:shadow-slate-900/50 backdrop-blur-xl min-h-[120px] md:min-h-[140px]"
              >
                <div className="relative flex items-center space-x-4 md:space-x-6 h-full">
                  <div className="flex-shrink-0 p-4 md:p-5 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-slate-600/50 backdrop-blur-sm shadow-lg shadow-slate-900/30">
                    <Store className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                  </div>

                  <div className="flex-1 text-left space-y-1 md:space-y-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white group-hover:text-white/90 transition-colors duration-300 leading-tight">
                      {cafe.name}
                    </h3>
                    <p className="text-sm md:text-base text-slate-300 group-hover:text-white/70 transition-colors duration-300">
                      Standard Access
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}

          {/* Add New Cafe Card */}
          <div className="group relative" style={{ animation: "fadeInUp 0.6s ease-out forwards" }}>
            <button
              onClick={() => handleCafeClick("add-new")}
              className="relative w-full p-6 md:p-8 rounded-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-emerald-600 to-cyan-600 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 backdrop-blur-xl min-h-[120px] md:min-h-[140px] border-2 border-dashed border-emerald-300/50"
            >
              <div className="relative flex items-center space-x-4 md:space-x-6 h-full">
                <div className="flex-shrink-0 p-4 md:p-5 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-white/20 backdrop-blur-sm shadow-lg">
                  <Plus className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>

                <div className="flex-1 text-left space-y-1 md:space-y-2">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white group-hover:text-white/90 transition-colors duration-300 leading-tight">
                    Add New Cafe
                  </h3>
                  <p className="text-sm md:text-base text-white/80 group-hover:text-white/70 transition-colors duration-300">
                    Onboard a new gaming cafe
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 shadow-2xl shadow-black/50 rounded-3xl">
          <DialogHeader className="text-center pb-2">
            <div className="relative mx-auto mb-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-900/50">
                {isUnlocking ? (
                  <Unlock className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <Lock className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Access {selectedCafeData?.name}
            </DialogTitle>
            <p className="text-slate-400 text-sm md:text-base mt-2">Enter your 4-digit PIN to continue</p>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="relative">
              <Input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center text-3xl tracking-[0.8em] h-16 border-2 border-slate-600/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl bg-slate-800/80 backdrop-blur-sm transition-all duration-300 text-white placeholder-slate-500 shadow-inner"
                onKeyPress={(e) => e.key === "Enter" && handleUnlock()}
                disabled={isUnlocking}
              />

              <div className="flex justify-center mt-4 space-x-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      i < pin.length
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500 scale-125 shadow-lg shadow-emerald-400/50"
                        : "bg-slate-600/50"
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleUnlock}
              disabled={pin.length !== 4 || isUnlocking || isSubmitting}
              className="w-full h-14 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:transform-none disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500"
            >
              {isUnlocking ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Validating PIN...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Unlock className="w-5 h-5" />
                  <span>Access Gaming Cafe</span>
                </div>
              )}
            </Button>

            {error && (
              <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                <p className="text-red-400 text-sm font-medium animate-pulse">{error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Onboard New Gaming Cafe
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Cafe Name *</Label>
                  <Input
                    value={formData.cafe_name}
                    onChange={(e) => setFormData({ ...formData, cafe_name: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Enter cafe name"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Owner Name *</Label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Enter owner name"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Parent Email (Auto-filled or enter manually)</Label>
                  <Input
                    value={formData.vendor_account_email}
                    onChange={(e) => setFormData({ ...formData, vendor_account_email: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Enter parent email"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Vendor PIN (Optional - 4 digits)</Label>
                  <Input
                    value={formData.vendor_pin}
                    onChange={(e) => setFormData({ ...formData, vendor_pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Leave empty for auto-generation"
                    maxLength={4}
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Vendor Password (Optional - min 6 chars)</Label>
                  <Input
                    type="password"
                    value={formData.vendor_password}
                    onChange={(e) => setFormData({ ...formData, vendor_password: e.target.value })}
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Leave empty for auto-generation"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Email *</Label>
                  <Input
                    type="email"
                    value={formData.contact_info.email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: { ...formData.contact_info, email: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="cafe@example.com"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Phone *</Label>
                  <Input
                    value={formData.contact_info.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: { ...formData.contact_info, phone: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Website</Label>
                  <Input
                    value={formData.contact_info.website}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: { ...formData.contact_info, website: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Physical Address */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Physical Address</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-slate-300">Street Address *</Label>
                  <Input
                    value={formData.physicalAddress.street}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, street: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">City *</Label>
                  <Input
                    value={formData.physicalAddress.city}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, city: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="City"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">State *</Label>
                  <Input
                    value={formData.physicalAddress.state}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, state: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="State"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">ZIP Code *</Label>
                  <Input
                    value={formData.physicalAddress.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, zipCode: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="123456"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Country *</Label>
                  <Input
                    value={formData.physicalAddress.country}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, country: e.target.value } })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="India"
                  />
                </div>
              </div>
            </div>

            {/* Business Registration */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Business Registration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Registration Number *</Label>
                  <Input
                    value={formData.business_registration_details.registration_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        business_registration_details: {
                          ...formData.business_registration_details,
                          registration_number: e.target.value,
                        },
                      })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="REG123456"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Business Type *</Label>
                  <Input
                    value={formData.business_registration_details.business_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        business_registration_details: {
                          ...formData.business_registration_details,
                          business_type: e.target.value,
                        },
                      })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="Gaming Cafe"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Tax ID *</Label>
                  <Input
                    value={formData.business_registration_details.tax_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        business_registration_details: {
                          ...formData.business_registration_details,
                          tax_id: e.target.value,
                        },
                      })
                    }
                    className="bg-slate-800/50 border-slate-600 text-white"
                    placeholder="TAX123456"
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Operating Hours</h3>
              
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28">
                      <span className="text-slate-300 capitalize">{day}</span>
                    </div>
                    
                    <Checkbox
                      checked={formData.timing[day]?.closed || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          timing: {
                            ...formData.timing,
                            [day]: { ...formData.timing[day], closed: checked as boolean },
                          },
                        })
                      }
                      className="border-slate-600"
                    />
                    <span className="text-slate-400 text-sm">Closed</span>

                    {!formData.timing[day]?.closed && (
                      <>
                        <Input
                          type="time"
                          value={formData.timing[day]?.open || "09:00"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timing: {
                                ...formData.timing,
                                [day]: { ...formData.timing[day], open: e.target.value },
                              },
                            })
                          }
                          className="bg-slate-800/50 border-slate-600 text-white w-32"
                        />
                        <span className="text-slate-400">to</span>
                        <Input
                          type="time"
                          value={formData.timing[day]?.close || "22:00"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timing: {
                                ...formData.timing,
                                [day]: { ...formData.timing[day], close: e.target.value },
                              },
                            })
                          }
                          className="bg-slate-800/50 border-slate-600 text-white w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Games */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Available Games</h3>
              
              {formData.available_games.map((game, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label className="text-slate-300">Game Name *</Label>
                    <Input
                      value={game.name}
                      onChange={(e) => {
                        const games = [...formData.available_games]
                        games[index].name = e.target.value
                        setFormData({ ...formData, available_games: games })
                      }}
                      className="bg-slate-800/50 border-slate-600 text-white"
                      placeholder="PS5, Xbox, PC"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Total Slots *</Label>
                    <Input
                      type="number"
                      value={game.total_slot}
                      onChange={(e) => {
                        const games = [...formData.available_games]
                        games[index].total_slot = parseInt(e.target.value) || 0
                        setFormData({ ...formData, available_games: games })
                      }}
                      className="bg-slate-800/50 border-slate-600 text-white"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Rate per Slot *</Label>
                    <Input
                      type="number"
                      value={game.rate_per_slot}
                      onChange={(e) => {
                        const games = [...formData.available_games]
                        games[index].rate_per_slot = parseInt(e.target.value) || 0
                        setFormData({ ...formData, available_games: games })
                      }}
                      className="bg-slate-800/50 border-slate-600 text-white"
                      placeholder="100"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        const games = formData.available_games.filter((_, i) => i !== index)
                        setFormData({ ...formData, available_games: games })
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={formData.available_games.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    available_games: [
                      ...formData.available_games,
                      { name: "", total_slot: 0, rate_per_slot: 0, gaming_type: "PC" },
                    ],
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Game
              </Button>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Documents</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(documents).map((docType) => (
                  <div key={docType} className="space-y-2">
                    <Label className="text-slate-300 capitalize">
                      {docType.replace(/_/g, " ")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(docType, e.target.files?.[0] || null)}
                        className="bg-slate-800/50 border-slate-600 text-white file:bg-emerald-600 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2"
                      />
                      {documents[docType] && (
                        <span className="text-emerald-400 text-sm">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleOnboardSubmit}
                disabled={isSubmitting}
                className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Onboarding...</span>
                  </div>
                ) : (
                  "Onboard Cafe"
                )}
              </Button>

              <Button
                onClick={() => setShowOnboardDialog(false)}
                disabled={isSubmitting}
                className="px-8 h-14 bg-slate-700 hover:bg-slate-600 text-white"
              >
                Cancel
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
