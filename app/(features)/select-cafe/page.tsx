"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Store, BarChart3, Lock, Unlock, Sparkles } from "lucide-react"
import { LOGIN_URL } from "@/src/config/env"
import { toast } from "sonner"

export default function SelectCafePage() {
  const [cafes, setCafes] = useState<{ id: string; name: string; type: string }[]>([])
  const [selectedCafe, setSelectedCafe] = useState<string | null>(null)
  const [pin, setPin] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const storedVendors = localStorage.getItem("vendors")
    console.log("Aja", storedVendors)
    if (storedVendors) {
      try {
        const parsed = JSON.parse(storedVendors)
        if (Array.isArray(parsed)) {
          const loadedCafes = parsed.map((vendor: any) => ({
            id: String(vendor.id),
            name: vendor.cafe_name.trim(),
            type: "store",
          }))
          loadedCafes.push({
            id: "master",
            name: "Master Analytics",
            type: "analytics",
          })
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
    setSelectedCafe(id)
    setShowDialog(true)
    setPin("")
    setError(null)
  }

  const selectedCafeData = cafes.find((cafe) => cafe.id === selectedCafe)

  // ADDED: Enhanced fetch with retry logic for Render.com reliability
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController()
      // CHANGED: Longer timeout for first attempt to handle cold start
      const timeout = attempt === 1 ? 30000 : 15000 // 30s first, 15s others
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        // ADDED: Show user feedback on first attempt
        if (attempt === 1) {
          toast.info("Validating PIN... This may take a moment.", {
            duration: 5000,
            id: "pin-validation",
          })
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          // ADDED: Cache-busting headers to prevent stale responses
          headers: {
            ...options.headers,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        clearTimeout(timeoutId)
        toast.dismiss("pin-validation")

        return response
      } catch (error) {
        clearTimeout(timeoutId)
        toast.dismiss("pin-validation")

        if (attempt === maxRetries) throw error

        // ADDED: Exponential backoff with user feedback
        const delay = attempt === 1 ? 5000 : 2000 // 5s after first failure, 2s others
        toast.info(`Connection failed. Retrying in ${delay / 1000} seconds...`, {
          duration: delay - 500,
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // ENHANCED: Improved handleUnlock with retry logic and better error handling
  const handleUnlock = async () => {
    // ADDED: Prevent double submissions
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

    // ADDED: Set both submission states to prevent double clicks
    setIsSubmitting(true)
    setIsUnlocking(true)

    // Special case for Master Analytics
    if (selectedCafeData.id === "master") {
      if (pin === "2430") {
        localStorage.setItem("selectedCafe", selectedCafeData.id)
        localStorage.setItem("jwtToken", "dummy-master-token")

        // ADDED: Set cookie for server-side auth consistency
        const oneHour = 60 * 60
        document.cookie = `jwt=dummy-master-token; max-age=${oneHour}; path=/; SameSite=Lax; Secure`

        // CHANGED: Use replace instead of push to prevent back button issues
        router.replace("/master")
      } else {
        setError("Invalid Master PIN.")
        triggerShake()
      }
      setIsUnlocking(false)
      setIsSubmitting(false)
      return
    }

    // ENHANCED: Normal Cafe PIN check via API with retry logic
    try {
      // ADDED: Cache-busting timestamp
      const timestamp = Date.now()
      const validateUrl = `${LOGIN_URL}/api/validatePin?t=${timestamp}`
      const response = await fetchWithRetry(validateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendor_id: selectedCafeData.id,
          pin,
          timestamp, // ADDED: Additional cache busting
        }),
      })

      // ADDED: Better response validation
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (data.status === "success") {
        localStorage.setItem("selectedCafe", selectedCafeData.id)
        localStorage.setItem("jwtToken", data.data.token)

        // ADDED: Set cookie for server-side auth consistency
        const oneHour = 60 * 60
        document.cookie = `jwt=${data.data.token}; max-age=${oneHour}; path=/; SameSite=Lax; Secure`

        toast.success("Access granted!")

        // CHANGED: Use replace instead of push to prevent back button issues
        router.replace("/dashboard")
      } else {
        setError(data.message || "Invalid PIN, please try again.")
        triggerShake()
      }
    } catch (err) {
      console.error("PIN validation error:", err)

      // ADDED: Enhanced error handling with specific messages
      let errorMessage = "Network error. Please try again."

      if (err.name === "AbortError") {
        errorMessage = "Request timed out. The server may be starting up. Please try again."
      } else if (err.message.includes("503") || err.message.includes("502")) {
        errorMessage = "Server is starting up. Please try again in a moment."
      } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        errorMessage = "Network connection issue. Please check your internet connection."
      }

      setError(errorMessage)
      triggerShake()
    }

    // ADDED: Always reset submission states
    setIsUnlocking(false)
    setIsSubmitting(false)
  }

  // Shake animation for error input
  function triggerShake() {
    const input = document.querySelector('input[type="password"]')
    input?.classList.add("animate-shake")
    setTimeout(() => input?.classList.remove("animate-shake"), 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-500/5 to-transparent rounded-full"></div>
      </div>

      <div className="relative max-w-7xl w-full flex flex-col items-center gap-8 md:gap-12 z-20">
        {/* Header Section */}
        <div className="text-center space-y-4 md:space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
           {/**  <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl shadow-lg shadow-emerald-500/25">
              <Sparkles className="w-8 h-8 text-white" />
            </div>**/}
          </div>

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
                className={`relative w-full p-6 md:p-8 rounded-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${
                  selectedCafe === cafe.id
                    ? cafe.type === "analytics"
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/25 border-2 border-emerald-300/30"
                      : "bg-gradient-to-br from-slate-700 to-slate-800 shadow-2xl shadow-slate-900/50 border-2 border-slate-500/30"
                    : cafe.type === "analytics"
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30"
                      : "bg-gradient-to-br from-slate-700 to-slate-800 shadow-xl shadow-slate-900/30 hover:shadow-slate-900/50"
                } backdrop-blur-xl min-h-[120px] md:min-h-[140px]`}
                aria-label={`Select ${cafe.name}`}
              >
                {/* Glow Effect */}
                <div
                  className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    cafe.type === "analytics"
                      ? "bg-gradient-to-br from-emerald-400/10 to-teal-500/10"
                      : "bg-gradient-to-br from-slate-600/10 to-slate-700/10"
                  }`}
                ></div>

                {/* Content - Horizontal Layout */}
                <div className="relative flex items-center space-x-4 md:space-x-6 h-full">
                  {/* Icon Container */}
                  <div
                    className={`flex-shrink-0 p-4 md:p-5 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                      cafe.type === "analytics"
                        ? "bg-white/20 backdrop-blur-sm shadow-lg shadow-white/10"
                        : "bg-slate-600/50 backdrop-blur-sm shadow-lg shadow-slate-900/30"
                    }`}
                  >
                    {cafe.type === "analytics" ? (
                      <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    ) : (
                      <Store className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 text-left space-y-1 md:space-y-2">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white group-hover:text-white/90 transition-colors duration-300 leading-tight">
                      {cafe.name}
                    </h3>
                    <p
                      className={`text-sm md:text-base ${
                        cafe.type === "analytics" ? "text-white/80" : "text-slate-300"
                      } group-hover:text-white/70 transition-colors duration-300`}
                    >
                      {cafe.type === "analytics" ? "Full Dashboard Access" : "Standard Access"}
                    </p>
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedCafe === cafe.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50"></div>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PIN Entry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 shadow-2xl shadow-black/50 rounded-3xl">
          <DialogHeader className="text-center pb-2">
            <div className="relative mx-auto mb-6">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
                  selectedCafeData?.type === "analytics"
                    ? "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-emerald-500/30"
                    : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-900/50"
                }`}
              >
                {isUnlocking ? (
                  <Unlock className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <Lock className="w-10 h-10 text-white" />
                )}
              </div>

              {/* Glow Ring */}
              <div
                className={`absolute inset-0 rounded-3xl ${
                  selectedCafeData?.type === "analytics"
                    ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20"
                    : "bg-gradient-to-br from-slate-500/20 to-slate-600/20"
                } blur-xl -z-10 animate-pulse`}
              ></div>
            </div>

            <DialogTitle className="text-2xl md:text-3xl md:text-center font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Access {selectedCafeData?.name}
            </DialogTitle>
            <p className="text-slate-400 text-sm md:text-center md:text-base mt-2">Enter your 4-digit PIN to continue</p>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* PIN Input */}
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

              {/* PIN Dots Indicator */}
              <div className="flex justify-center mt-4 space-x-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      i < pin.length
                        ? selectedCafeData?.type === "analytics"
                          ? "bg-gradient-to-r from-emerald-400 to-cyan-400 scale-125 shadow-lg shadow-emerald-400/50"
                          : "bg-gradient-to-r from-emerald-400 to-emerald-500 scale-125 shadow-lg shadow-emerald-400/50"
                        : "bg-slate-600/50"
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            {/* Unlock Button */}
            <Button
              onClick={handleUnlock}
              disabled={pin.length !== 4 || isUnlocking || isSubmitting}
              className={`w-full h-14 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:transform-none disabled:opacity-50 ${
                selectedCafeData?.type === "analytics"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 shadow-emerald-500/30 hover:shadow-emerald-500/50"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/30 hover:shadow-emerald-500/50"
              }`}
            >
              {isUnlocking ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Validating PIN...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Unlock className="w-5 h-5" />
                  <span>Access {selectedCafeData?.type === "analytics" ? "Analytics" : "Gaming Cafe"}</span>
                </div>
              )}
            </Button>

            {/* Error Message */}
            {error && (
              <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                <p className="text-red-400 text-sm font-medium animate-pulse">{error}</p>
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

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  )
}
