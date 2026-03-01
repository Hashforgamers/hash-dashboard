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

const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]

const DAYS_OF_WEEK = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
]

const CONSOLE_TYPES = ["pc", "ps5", "xbox"] as const
type ConsoleType = (typeof CONSOLE_TYPES)[number]

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

  const [formData, setFormData] = useState({
    cafe_name: "",
    owner_name: "",
    vendor_account_email: "",
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
    available_games: [{ name: "pc", total_slot: 0, rate_per_slot: 0, gaming_type: "PC" as ConsoleType }],
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

  const refreshVendorList = () => {
    const storedVendors = localStorage.getItem("vendors")
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
        }
      } catch (error) {
        console.error("Failed to parse vendors from localStorage", error)
      }
    }
  }

  useEffect(() => {
    const userEmail = localStorage.getItem("vendor_account_email") || localStorage.getItem("vendor_login_email")
    if (userEmail) {
      setFormData((prev) => ({ ...prev, vendor_account_email: userEmail }))
    }

    const initialTiming: Record<string, { open: string; close: string; closed: boolean }> = {}
    DAYS_OF_WEEK.forEach((day) => {
      initialTiming[day.key] = { open: "09:00", close: "22:00", closed: false }
    })
    setFormData((prev) => ({ ...prev, timing: initialTiming }))
    refreshVendorList()
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
      if (isNaN(hour) || hour < 0 || hour > 23) return null
      const period = hour >= 12 ? "PM" : "AM"
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const paddedHour = hour12.toString().padStart(2, "0")
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
      if (!formData.cafe_name || !formData.owner_name || !formData.contact_info.email) {
        toast.error("Please fill all required fields")
        setIsSubmitting(false)
        return
      }

      for (const game of formData.available_games) {
        if (!CONSOLE_TYPES.includes(game.name as ConsoleType)) {
          toast.error("Available console must be one of: pc, ps5, xbox")
          setIsSubmitting(false)
          return
        }
        if (game.total_slot < 0 || !Number.isInteger(game.total_slot)) {
          toast.error("Total slots must be a non-negative whole number")
          setIsSubmitting(false)
          return
        }
        if (game.rate_per_slot < 0 || !Number.isInteger(game.rate_per_slot)) {
          toast.error("Rate per slot must be a non-negative whole number")
          setIsSubmitting(false)
          return
        }
      }

      const timing12Hour: Record<string, { open: string; close: string; closed: boolean }> = {}
      for (const day of DAYS_OF_WEEK) {
        const dayTiming = formData.timing[day.key]
        timing12Hour[day.key] = {
          open: dayTiming.closed ? "" : convertTo12HourFormat(dayTiming.open) || "",
          close: dayTiming.closed ? "" : convertTo12HourFormat(dayTiming.close) || "",
          closed: dayTiming.closed,
        }
      }

      const formDataToSend = new FormData()
      const jsonData = { ...formData, timing: timing12Hour }
      formDataToSend.append("json", JSON.stringify(jsonData))

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

        try {
          const loginResponse = await fetch(`${LOGIN_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: formData.vendor_account_email,
              password: formData.vendor_password || "temp",
              parent_type: "vendor",
            }),
          })

          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            if (loginData.vendors && Array.isArray(loginData.vendors)) {
              localStorage.setItem("vendors", JSON.stringify(loginData.vendors))
              refreshVendorList()
            }
          }
        } catch (err) {
          console.error("Failed to refresh vendor list:", err)
        }

        setTimeout(() => { window.location.reload() }, 2000)
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

  // ✅ FIXED: Parse JSON body BEFORE checking response.ok so server's error message is never lost
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: selectedCafeData.id,
          pin,
          timestamp,
        }),
      })

      // ✅ Always parse JSON first, regardless of HTTP status
      let data: any = {}
      try {
        data = await response.json()
      } catch {
        throw new Error("Server returned an unexpected response.")
      }

      // ✅ Handle 4xx: use server's message (e.g. "Invalid PIN" or "Invalid credentials")
      if (!response.ok) {
        const message =
          data.message ||
          data.error ||
          (response.status === 401
            ? "Invalid PIN. Please try again."
            : response.status === 403
            ? "Access denied."
            : `PIN validation failed (${response.status}). Please try again.`)
        setError(message)
        triggerShake()
        return // ✅ Return early — don't fall into catch block
      }

      // ✅ Handle 200 OK with status field
      if (data.status === "success") {
        localStorage.setItem("selectedCafe", selectedCafeData.id)
        localStorage.setItem("jwtToken", data.data.token)

        const oneHour = 60 * 60
        document.cookie = `jwt=${data.data.token}; max-age=${oneHour}; path=/; SameSite=Lax; Secure`

        toast.success("Access granted!")
        router.replace("/dashboard")
      } else {
        // ✅ 200 but status !== "success" (custom error format from Flask)
        const message = data.message || "Invalid PIN. Please try again."
        setError(message)
        triggerShake()
      }
    } catch (err: any) {
      console.error("PIN validation error:", err)

      // ✅ Only true network/timeout errors reach here now
      let errorMessage = "Network error. Please check your connection."
      if (err.name === "AbortError") {
        errorMessage = "Request timed out. Please try again."
      } else if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        errorMessage = "Network error. Please check your internet connection."
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      triggerShake()
    } finally {
      setIsUnlocking(false)
      setIsSubmitting(false)
    }
  }

  function triggerShake() {
    const input = document.querySelector("#access-pin")
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
    <div className="premium-shell flex min-h-screen flex-col items-center justify-center overflow-hidden p-3 sm:p-4 md:p-8">
      <div className="relative z-20 flex w-full max-w-7xl flex-col items-center gap-8 md:gap-12">
        <div className="text-center space-y-4 md:space-y-6">
          <h1 className="premium-heading premium-accent-text select-none text-4xl font-bold tracking-tight md:mb-2 md:text-5xl lg:text-7xl">
            Select Your Arena
          </h1>
          <p className="premium-subtle mx-auto max-w-2xl select-none text-lg leading-relaxed md:text-lg">
            Choose a cafe, verify PIN, and launch your operations dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl">
          {cafes.map((cafe, index) => (
            <div
              key={cafe.id}
              className="group relative"
              style={{ animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.6s ease-out forwards" }}
            >
              <button
                onClick={() => handleCafeClick(cafe.id)}
                className="premium-card relative min-h-[120px] w-full rounded-3xl p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 md:min-h-[140px] md:p-8"
              >
                <div className="relative flex items-center space-x-4 md:space-x-6 h-full">
                  <div className="flex-shrink-0 rounded-2xl bg-slate-500/30 p-4 shadow-lg shadow-slate-900/30 transition-all duration-300 group-hover:scale-110 md:p-5">
                    <Store className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                  </div>
                  <div className="flex-1 text-left space-y-1 md:space-y-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white group-hover:text-white/90 transition-colors duration-300 leading-tight">
                      {cafe.name}
                    </h3>
                    <p className="text-sm md:text-base text-slate-300 group-hover:text-white/70 transition-colors duration-300">
                      Operator Access
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}

          <div className="group relative" style={{ animation: "fadeInUp 0.6s ease-out forwards" }}>
            <button
              onClick={() => handleCafeClick("add-new")}
              className="relative min-h-[120px] w-full rounded-3xl border-2 border-dashed border-emerald-300/40 bg-gradient-to-br from-emerald-600/85 to-cyan-600/85 p-6 shadow-xl shadow-emerald-500/30 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-emerald-500/50 md:min-h-[140px] md:p-8"
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
                    Register a new gaming cafe
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="premium-card w-[calc(100vw-1.5rem)] rounded-3xl border shadow-2xl shadow-black/50 sm:max-w-md">
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
                id="access-pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""))
                  setError(null)
                }}
                placeholder="••••"
                className="text-center text-3xl tracking-[0.8em] h-16 border-2 border-slate-600/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl bg-slate-800/80 backdrop-blur-sm transition-all duration-300 text-white placeholder-slate-500 shadow-inner"
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
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
                  />
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
                  <span>Open Dashboard</span>
                </div>
              )}
            </Button>

            {error && (
              <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent className="premium-card max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto rounded-3xl border">
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
                  <Label className="text-slate-300">Parent Email (Auto-filled, cannot be changed)</Label>
                  <Input
                    value={formData.vendor_account_email}
                    disabled
                    className="bg-slate-800/50 border-slate-600 text-slate-300 cursor-not-allowed opacity-80"
                    placeholder="Parent email"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Vendor PIN (Optional - 4 digits)</Label>
                  <Input
                    value={formData.vendor_pin}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                    }
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
                  <select
                    value={formData.physicalAddress.state}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, state: e.target.value } })
                    }
                    className="w-full rounded-md bg-slate-800/50 border border-slate-600 text-white px-3 py-2 text-sm"
                  >
                    <option value="" disabled>Select state</option>
                    {INDIA_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
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

            {/* Operating Hours */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Operating Hours</h3>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="flex items-center gap-4">
                    <div className="w-28">
                      <span className="text-slate-300">{day.label}</span>
                    </div>
                    <Checkbox
                      checked={formData.timing[day.key]?.closed || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          timing: {
                            ...formData.timing,
                            [day.key]: { ...formData.timing[day.key], closed: checked as boolean },
                          },
                        })
                      }
                      className="border-slate-600"
                    />
                    <span className="text-slate-400 text-sm">Closed</span>
                    {!formData.timing[day.key]?.closed && (
                      <>
                        <Input
                          type="time"
                          value={formData.timing[day.key]?.open || "09:00"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timing: {
                                ...formData.timing,
                                [day.key]: { ...formData.timing[day.key], open: e.target.value },
                              },
                            })
                          }
                          className="bg-slate-800/50 border-slate-600 text-white w-32"
                        />
                        <span className="text-slate-400">to</span>
                        <Input
                          type="time"
                          value={formData.timing[day.key]?.close || "22:00"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timing: {
                                ...formData.timing,
                                [day.key]: { ...formData.timing[day.key], close: e.target.value },
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

            {/* Available Consoles */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Available Consoles</h3>
              <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
                <p className="text-green-300 text-xs">
                  <strong>Console Auto-Creation:</strong> Individual console records will be automatically created based on
                  the number of slots. For example, 5 PC slots will create PC-1, PC-2, PC-3, PC-4, PC-5.
                </p>
              </div>
              {formData.available_games.map((game, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label className="text-slate-300">Available Console *</Label>
                    <select
                      value={game.name}
                      onChange={(e) => {
                        const value = e.target.value as ConsoleType
                        const games = [...formData.available_games]
                        games[index].name = value
                        games[index].gaming_type = value
                        setFormData({ ...formData, available_games: games })
                      }}
                      className="w-full rounded-md bg-slate-800/50 border border-slate-600 text-white px-3 py-2 text-sm"
                    >
                      <option value="" disabled>Select console</option>
                      {CONSOLE_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Total Slots *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={game.total_slot}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                        const games = [...formData.available_games]
                        games[index].total_slot = val
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
                      min={0}
                      value={game.rate_per_slot}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                        const games = [...formData.available_games]
                        games[index].rate_per_slot = val
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
                      { name: "pc", total_slot: 0, rate_per_slot: 0, gaming_type: "PC" as ConsoleType },
                    ],
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Console
              </Button>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(documents).map((docType) => (
                  <div key={docType} className="space-y-2">
                    <Label className="text-slate-300 capitalize">{docType.replace(/_/g, " ")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(docType, e.target.files?.[0] || null)}
                        className="bg-slate-800/50 border-slate-600 text-white file:bg-emerald-600 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2"
                      />
                      {documents[docType] && <span className="text-emerald-400 text-sm">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
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
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}
