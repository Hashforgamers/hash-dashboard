"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Store, Lock, Unlock, Plus, X } from "lucide-react"
import { DASHBOARD_URL, LOGIN_URL, VENDOR_ONBOARD_URL } from "@/src/config/env"
import { toast } from "sonner"
import { useAccess } from "@/app/context/AccessContext"
import { accessApi } from "@/lib/access-api"
import { DashboardLayout } from "../../(layout)/dashboard-layout"

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

const DEFAULT_CONSOLE_TYPES = ["pc", "ps5", "xbox"]

export default function SelectCafePage() {
  const [cafes, setCafes] = useState<{ id: string; name: string; type: string }[]>([])
  const [selectedCafe, setSelectedCafeId] = useState<string | null>(null)
  const [pin, setPin] = useState("")
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showOnboardDialog, setShowOnboardDialog] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [consoleTypeOptions, setConsoleTypeOptions] = useState<string[]>(DEFAULT_CONSOLE_TYPES)
  const { setSelectedCafe: setActiveCafe } = useAccess()
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
    available_games: [{ name: "pc", total_slot: 0, rate_per_slot: 0, gaming_type: "PC" }],
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

  const formInputClass = "ui-input-surface"
  const formSelectClass = "ui-input-surface w-full rounded-md px-3 py-2 text-sm"
  const sectionHeadingClass = "text-xl font-semibold text-slate-900 dark:text-white"
  const labelClass = "text-slate-700 dark:text-slate-300"

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

    const to24Hour = (value: string): string => {
      const raw = String(value || "").trim()
      if (!raw) return "09:00"
      const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*([APap][Mm])$/)
      if (m12) {
        let h = parseInt(m12[1], 10)
        const mm = m12[2]
        const meridiem = m12[3].toUpperCase()
        if (meridiem === "PM" && h < 12) h += 12
        if (meridiem === "AM" && h === 12) h = 0
        return `${String(h).padStart(2, "0")}:${mm}`
      }
      const m24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
      if (m24) {
        return `${String(parseInt(m24[1], 10)).padStart(2, "0")}:${m24[2]}`
      }
      return "09:00"
    }

    const initialTiming: Record<string, { open: string; close: string; closed: boolean }> = {}
    DAYS_OF_WEEK.forEach((day) => {
      initialTiming[day.key] = { open: "09:00", close: "22:00", closed: false }
    })

    if (userEmail) {
      setFormData((prev) => ({ ...prev, vendor_account_email: userEmail }))
    }
    setFormData((prev) => ({ ...prev, timing: initialTiming }))
    refreshVendorList()

    const loadConsoleCatalog = async () => {
      try {
        const res = await fetch(`${DASHBOARD_URL}/api/console-types?include_inactive=false`)
        if (!res.ok) return
        const payload = await res.json()
        const rows = Array.isArray(payload?.console_types) ? payload.console_types : []
        const options: string[] = Array.from(
          new Set(
            rows
              .map((item: any) => String(item?.slug || item?.name || "").trim().toLowerCase())
              .filter(Boolean)
          )
        ) as string[]
        if (options.length > 0) {
          setConsoleTypeOptions(options)
          setFormData((prev) => {
            if (!Array.isArray(prev.available_games) || prev.available_games.length === 0) {
              const first: string = options[0]
              return {
                ...prev,
                available_games: [{ name: first, total_slot: 0, rate_per_slot: 0, gaming_type: first.toUpperCase() }],
              }
            }
            return prev
          })
        }
      } catch (error) {
        console.warn("Could not load console catalog; using defaults", error)
      }
    }

    const hydrateBranchDefaults = async () => {
      if (!userEmail) return
      try {
        const res = await fetch(`${VENDOR_ONBOARD_URL}/api/vendor/branch-defaults?email=${encodeURIComponent(userEmail)}`)
        if (!res.ok) return
        const payload = await res.json()
        const defaults = payload?.defaults
        if (!defaults || typeof defaults !== "object") return

        setFormData((prev) => {
          const nextTiming = { ...initialTiming }
          const defaultsTiming = defaults.timing && typeof defaults.timing === "object" ? defaults.timing : {}
          for (const day of DAYS_OF_WEEK) {
            const dayDefaults = defaultsTiming[day.key] || {}
            nextTiming[day.key] = {
              open: to24Hour(dayDefaults.open || initialTiming[day.key].open),
              close: to24Hour(dayDefaults.close || initialTiming[day.key].close),
              closed: Boolean(dayDefaults.closed ?? initialTiming[day.key].closed),
            }
          }

          return {
            ...prev,
            owner_name: defaults.owner_name || prev.owner_name,
            vendor_account_email: defaults.vendor_account_email || prev.vendor_account_email || userEmail,
            contact_info: {
              ...prev.contact_info,
              ...(defaults.contact_info || {}),
              email: (defaults.contact_info?.email || prev.contact_info.email || userEmail),
            },
            physicalAddress: {
              ...prev.physicalAddress,
              ...(defaults.physicalAddress || {}),
            },
            business_registration_details: {
              ...prev.business_registration_details,
              ...(defaults.business_registration_details || {}),
            },
            document_submitted: {
              ...prev.document_submitted,
              ...(defaults.document_submitted || {}),
            },
            timing: nextTiming,
            available_games: Array.isArray(defaults.available_games) && defaults.available_games.length > 0
              ? defaults.available_games
              : prev.available_games,
          }
        })
      } catch (error) {
        console.warn("Could not load branch defaults", error)
      }
    }

    void loadConsoleCatalog()
    void hydrateBranchDefaults()
  }, [])

  const handleCafeClick = (id: string) => {
    if (id === "add-new") {
      setShowOnboardDialog(true)
      return
    }
    setSelectedCafeId(id)
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
        if (!consoleTypeOptions.includes(String(game.name || "").trim().toLowerCase())) {
          toast.error("Available console must be from the console catalog")
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
        // Staff PINs are validated by dashboard access service, not login-service validatePin.
        if (response.status === 401) {
          try {
            const accessSession = await accessApi.unlockByPin(selectedCafeData.id, pin)
            localStorage.setItem("jwtToken", accessSession.token)
            localStorage.setItem("rbac_access_token_v1", accessSession.token)
            localStorage.setItem("tokenExpiration", String(Date.now() + 24 * 60 * 60 * 1000))
            setActiveCafe(selectedCafeData.id)

            const oneDay = 24 * 60 * 60
            document.cookie = `jwt=${accessSession.token}; max-age=${oneDay}; path=/; SameSite=Lax; Secure`

            toast.success("Access granted!")
            router.replace("/dashboard")
            return
          } catch {
            // Fall through to existing message handling below.
          }
        }

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
        localStorage.setItem("jwtToken", data.data.token)
        const expiresInSec = Number(data?.data?.expires_in || 24 * 60 * 60)
        localStorage.setItem("tokenExpiration", String(Date.now() + expiresInSec * 1000))

        // Bootstrap RBAC token with the same cafe PIN (owner/staff unlock path)
        try {
          const accessSession = await accessApi.unlockByPin(selectedCafeData.id, pin)
          localStorage.setItem("rbac_access_token_v1", accessSession.token)
        } catch (rbacError) {
          console.warn("RBAC unlock bootstrap failed:", rbacError)
          toast.warning("Cafe unlocked, but owner RBAC session bootstrap failed. Team access actions may fail until this is fixed.")
        }

        setActiveCafe(selectedCafeData.id)

        const maxAge = Math.max(60, expiresInSec)
        document.cookie = `jwt=${data.data.token}; max-age=${maxAge}; path=/; SameSite=Lax; Secure`

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
    <DashboardLayout contentScroll="contained">
      <div className="premium-shell flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6 md:px-8">
      <div className="relative z-20 flex w-full max-w-6xl flex-col items-center gap-8 md:gap-10">
        <div className="space-y-4 text-center">
          <h1 className="premium-heading select-none text-[2.1rem] font-bold tracking-[0.08em] text-[#F7FAFC] md:text-[3rem] lg:text-[4.5rem]">
            Select Your Arena
          </h1>
          <p className="premium-subtle mx-auto max-w-2xl select-none text-sm leading-relaxed text-[rgba(255,255,255,0.68)] md:text-base">
            Choose a cafe, verify PIN, and launch your operations dashboard.
          </p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {cafes.map((cafe, index) => (
            <div
              key={cafe.id}
              className="group relative"
              style={{ animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.6s ease-out forwards" }}
            >
              <button
                onClick={() => handleCafeClick(cafe.id)}
                className="premium-card relative min-h-[132px] w-full rounded-[24px] border border-white/10 bg-transparent p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#16FF00]/25 hover:bg-white/[0.03] md:min-h-[144px]"
              >
                <div className="relative flex h-full items-center gap-4 md:gap-5">
                  <div className="feature-action-icon h-16 w-16 flex-shrink-0 rounded-[20px] border border-white/10 bg-white/5 shadow-lg transition-all duration-300 group-hover:scale-105 md:h-[72px] md:w-[72px]">
                    <Store className="h-8 w-8 text-[#16FF00] md:h-9 md:w-9" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.45)]">
                      Cafe Access
                    </p>
                    <h3 className="text-lg font-semibold leading-tight text-[#F7FAFC] transition-colors duration-300 md:text-[1.35rem]">
                      {cafe.name}
                    </h3>
                    <p className="text-sm text-[rgba(255,255,255,0.68)] md:text-[15px]">
                      Operator access
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}

          <div className="group relative" style={{ animation: "fadeInUp 0.6s ease-out forwards" }}>
            <button
              onClick={() => handleCafeClick("add-new")}
              className="premium-card relative min-h-[132px] w-full rounded-[24px] border border-dashed border-[#38BDF8]/35 bg-transparent p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#16FF00]/35 hover:bg-white/[0.03] md:min-h-[144px]"
            >
              <div className="relative flex h-full items-center gap-4 md:gap-5">
                <div className="feature-action-icon h-16 w-16 flex-shrink-0 rounded-[20px] border border-white/10 bg-white/5 transition-all duration-300 group-hover:scale-105 md:h-[72px] md:w-[72px]">
                  <Plus className="h-8 w-8 text-[#38BDF8] md:h-9 md:w-9" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.45)]">
                    New Setup
                  </p>
                  <h3 className="text-lg font-semibold leading-tight text-[#F7FAFC] transition-colors duration-300 md:text-[1.35rem]">
                    Add New Cafe
                  </h3>
                  <p className="text-sm text-[rgba(255,255,255,0.68)] md:text-[15px]">
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
              <div className="feature-action-icon h-20 w-20 rounded-3xl shadow-2xl">
                {isUnlocking ? (
                  <Unlock className="h-10 w-10 animate-pulse text-slate-900 dark:text-white" />
                ) : (
                  <Lock className="h-10 w-10 text-slate-900 dark:text-white" />
                )}
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-white">
              Access {selectedCafeData?.name}
            </DialogTitle>
            <p className="mt-2 text-sm text-slate-600 md:text-base dark:text-slate-400">Enter your 4-digit PIN to continue</p>
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
                className="ui-input-surface h-16 rounded-2xl border-2 text-center text-3xl tracking-[0.8em] shadow-inner transition-all duration-300"
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                disabled={isUnlocking}
              />

              <div className="flex justify-center mt-4 space-x-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      i < pin.length
                        ? "bg-emerald-500 scale-125 shadow-lg shadow-emerald-400/50"
                        : "bg-slate-300 dark:bg-slate-600/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleUnlock}
              disabled={pin.length !== 4 || isUnlocking || isSubmitting}
              className="ui-action-primary h-14 w-full rounded-2xl text-lg font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:transform-none disabled:opacity-50"
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
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent className="premium-card max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto rounded-3xl border">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-slate-900 dark:text-white">
              Onboard New Gaming Cafe
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>Cafe Name *</Label>
                  <Input
                    value={formData.cafe_name}
                    onChange={(e) => setFormData({ ...formData, cafe_name: e.target.value })}
                    className={formInputClass}
                    placeholder="Enter cafe name"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Owner Name *</Label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className={formInputClass}
                    placeholder="Enter owner name"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Parent Email (Auto-filled, cannot be changed)</Label>
                  <Input
                    value={formData.vendor_account_email}
                    disabled
                    className="ui-input-surface cursor-not-allowed opacity-80"
                    placeholder="Parent email"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Vendor PIN (Optional - 4 digits)</Label>
                  <Input
                    value={formData.vendor_pin}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor_pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                    }
                    className={formInputClass}
                    placeholder="Leave empty for auto-generation"
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Vendor Password (Optional - min 6 chars)</Label>
                  <Input
                    type="password"
                    value={formData.vendor_password}
                    onChange={(e) => setFormData({ ...formData, vendor_password: e.target.value })}
                    className={formInputClass}
                    placeholder="Leave empty for auto-generation"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className={labelClass}>Email *</Label>
                  <Input
                    type="email"
                    value={formData.contact_info.email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: { ...formData.contact_info, email: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="cafe@example.com"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Phone *</Label>
                  <Input
                    value={formData.contact_info.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: { ...formData.contact_info, phone: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Website</Label>
                  <Input
                    value={formData.contact_info.website}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_info: { ...formData.contact_info, website: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Physical Address */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Physical Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className={labelClass}>Street Address *</Label>
                  <Input
                    value={formData.physicalAddress.street}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, street: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label className={labelClass}>City *</Label>
                  <Input
                    value={formData.physicalAddress.city}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, city: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label className={labelClass}>State *</Label>
                  <select
                    value={formData.physicalAddress.state}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, state: e.target.value } })
                    }
                    className={formSelectClass}
                  >
                    <option value="" disabled>Select state</option>
                    {INDIA_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={labelClass}>ZIP Code *</Label>
                  <Input
                    value={formData.physicalAddress.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, zipCode: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="123456"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Country *</Label>
                  <Input
                    value={formData.physicalAddress.country}
                    onChange={(e) =>
                      setFormData({ ...formData, physicalAddress: { ...formData.physicalAddress, country: e.target.value } })
                    }
                    className={formInputClass}
                    placeholder="India"
                  />
                </div>
              </div>
            </div>

            {/* Business Registration */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Business Registration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className={labelClass}>Registration Number *</Label>
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
                    className={formInputClass}
                    placeholder="REG123456"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Business Type *</Label>
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
                    className={formInputClass}
                    placeholder="Gaming Cafe"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Tax ID *</Label>
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
                    className={formInputClass}
                    placeholder="TAX123456"
                  />
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Operating Hours</h3>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="flex items-center gap-4">
                    <div className="w-28">
                      <span className="text-slate-700 dark:text-slate-300">{day.label}</span>
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
                    <span className="text-sm text-slate-600 dark:text-slate-400">Closed</span>
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
                          className="ui-input-surface w-32"
                        />
                        <span className="text-slate-600 dark:text-slate-400">to</span>
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
                          className="ui-input-surface w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Consoles */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Available Consoles</h3>
              <div className="rounded p-3 border border-emerald-300 bg-emerald-50 dark:border-green-700/50 dark:bg-green-900/20">
                <p className="text-xs text-emerald-800 dark:text-green-300">
                  <strong>Console Auto-Creation:</strong> Individual console records will be automatically created based on
                  the number of slots. For example, 5 PC slots will create PC-1, PC-2, PC-3, PC-4, PC-5.
                </p>
              </div>
              {formData.available_games.map((game, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label className={labelClass}>Available Console *</Label>
                    <select
                      value={game.name}
                      onChange={(e) => {
                        const value = e.target.value
                        const games = [...formData.available_games]
                        games[index].name = value
                        games[index].gaming_type = value
                        setFormData({ ...formData, available_games: games })
                      }}
                      className={formSelectClass}
                    >
                      <option value="" disabled>Select console</option>
                      {consoleTypeOptions.map((ct) => (
                        <option key={ct} value={ct}>{ct.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={labelClass}>Total Slots *</Label>
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
                      className={formInputClass}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label className={labelClass}>Rate per Slot *</Label>
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
                      className={formInputClass}
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
                      className="border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/12 dark:text-rose-200 dark:hover:bg-rose-500/20"
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
                      {
                        name: consoleTypeOptions[0] || "pc",
                        total_slot: 0,
                        rate_per_slot: 0,
                        gaming_type: String(consoleTypeOptions[0] || "pc").toUpperCase(),
                      },
                    ],
                  })
                }
                className="ui-action-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Console
              </Button>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClass}>Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(documents).map((docType) => (
                  <div key={docType} className="space-y-2">
                    <Label className={`${labelClass} capitalize`}>{docType.replace(/_/g, " ")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(docType, e.target.files?.[0] || null)}
                        className="ui-input-surface file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-white dark:file:bg-emerald-600"
                      />
                      {documents[docType] && <span className="text-sm text-emerald-700 dark:text-emerald-400">✓</span>}
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
                className="ui-action-primary flex-1 h-14 text-lg font-bold text-white"
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
                className="slot-booking-modal-secondary px-8 h-14"
              >
                Cancel
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
    </DashboardLayout>
  )
}
