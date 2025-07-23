"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Store, BarChart3, Lock, Unlock } from "lucide-react";
import { LOGIN_URL } from "@/src/config/env";
import { toast } from "sonner";

export default function SelectCafePage() {
  const [cafes, setCafes] = useState<
    { id: string; name: string; type: string }[]
  >([]);
  const [selectedCafe, setSelectedCafe] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedVendors = localStorage.getItem("vendors");
    console.log("Aja", storedVendors);
    if (storedVendors) {
      try {
        const parsed = JSON.parse(storedVendors);
        if (Array.isArray(parsed)) {
          const loadedCafes = parsed.map((vendor: any) => ({
            id: String(vendor.id),
            name: vendor.cafe_name.trim(),
            type: "store",
          }));

          loadedCafes.push({
            id: "master",
            name: "Master Analytics",
            type: "analytics",
          });

          setCafes(loadedCafes);
        } else {
          setCafes([]);
        }
      } catch (error) {
        console.error("Failed to parse vendors from localStorage", error);
        setCafes([]);
      }
    } else {
      setCafes([]);
    }
  }, []);


  const handleCafeClick = (id: string) => {
    setSelectedCafe(id);
    setShowDialog(true);
    setPin("");
    setError(null);
  };

  const selectedCafeData = cafes.find(cafe => cafe.id === selectedCafe);

    // ADDED: Enhanced fetch with retry logic for Render.com reliability
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      // CHANGED: Longer timeout for first attempt to handle cold start
      const timeout = attempt === 1 ? 30000 : 15000; // 30s first, 15s others
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // ADDED: Show user feedback on first attempt
        if (attempt === 1) {
          toast.info("Validating PIN... This may take a moment.", { 
            duration: 5000,
            id: "pin-validation"
          });
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          // ADDED: Cache-busting headers to prevent stale responses
          headers: {
            ...options.headers,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        clearTimeout(timeoutId);
        toast.dismiss("pin-validation");
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        toast.dismiss("pin-validation");
        
        if (attempt === maxRetries) throw error;
        
        // ADDED: Exponential backoff with user feedback
        const delay = attempt === 1 ? 5000 : 2000; // 5s after first failure, 2s others
        toast.info(`Connection failed. Retrying in ${delay/1000} seconds...`, { 
          duration: delay - 500 
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // ENHANCED: Improved handleUnlock with retry logic and better error handling
  const handleUnlock = async () => {
    // ADDED: Prevent double submissions
    if (isSubmitting) return;
    
    setError(null);

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError("Please enter a valid 4-digit PIN.");
      triggerShake();
      return;
    }

    if (!selectedCafeData) {
      setError("No cafe selected.");
      return;
    }

    // ADDED: Set both submission states to prevent double clicks
    setIsSubmitting(true);
    setIsUnlocking(true);

    // Special case for Master Analytics
    if (selectedCafeData.id === "master") {
      if (pin === "2430") {
        localStorage.setItem("selectedCafe", selectedCafeData.id);
        localStorage.setItem("jwtToken", "dummy-master-token");
        
        // ADDED: Set cookie for server-side auth consistency
        const oneHour = 60 * 60;
        document.cookie = `jwt=dummy-master-token; max-age=${oneHour}; path=/; SameSite=Lax; Secure`;
        
        // CHANGED: Use replace instead of push to prevent back button issues
        router.replace("/master");
      } else {
        setError("Invalid Master PIN.");
        triggerShake();
      }
      setIsUnlocking(false);
      setIsSubmitting(false);
      return;
    }

    // ENHANCED: Normal Cafe PIN check via API with retry logic
    try {
      // ADDED: Cache-busting timestamp
      const timestamp = Date.now();
      const validateUrl = `${LOGIN_URL}/api/validatePin?t=${timestamp}`;

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
      });

      // ADDED: Better response validation
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        localStorage.setItem("selectedCafe", selectedCafeData.id);
        localStorage.setItem("jwtToken", data.data.token);
        
        // ADDED: Set cookie for server-side auth consistency
        const oneHour = 60 * 60;
        document.cookie = `jwt=${data.data.token}; max-age=${oneHour}; path=/; SameSite=Lax; Secure`;
        
        toast.success("Access granted!");
        
        // CHANGED: Use replace instead of push to prevent back button issues
        router.replace("/dashboard");
      } else {
        setError(data.message || "Invalid PIN, please try again.");
        triggerShake();
      }
    } catch (err) {
      console.error("PIN validation error:", err);
      
      // ADDED: Enhanced error handling with specific messages
      let errorMessage = "Network error. Please try again.";
      
      if (err.name === 'AbortError') {
        errorMessage = "Request timed out. The server may be starting up. Please try again.";
      } else if (err.message.includes('503') || err.message.includes('502')) {
        errorMessage = "Server is starting up. Please try again in a moment.";
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = "Network connection issue. Please check your internet connection.";
      }
      
      setError(errorMessage);
      triggerShake();
    }

    // ADDED: Always reset submission states
    setIsUnlocking(false);
    setIsSubmitting(false);
  };

  // Shake animation for error input
  function triggerShake() {
    const input = document.querySelector('input[type="password"]');
    input?.classList.add('animate-shake');
    setTimeout(() => input?.classList.remove('animate-shake'), 500);
  }

  return (
    <div className="min-h-screen bg-transparent from-gray-900 via-slate-900 to-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="relative max-w-7xl w-full flex flex-col items-center gap-10 z-20">
        <h1 className="text-white text-5xl font-bold tracking-tight text-center select-none">
          Select Gaming Cafe
        </h1>
        <p className="text-gray-400 text-center max-w-xl select-none">
          Choose your cafe and enter your PIN to unlock the dashboard.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {cafes.map((cafe) => (
            <button
              key={cafe.id}
              onClick={() => handleCafeClick(cafe.id)}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-lg transition-shadow duration-300 ${
                selectedCafe === cafe.id
                  ? "shadow-green-600"
                  : "shadow-black/20 hover:shadow-green-500"
              } bg-gray-800 hover:bg-gray-700 text-white`}
              aria-label={`Select ${cafe.name}`}
            >
              <div className="mb-4">
                {cafe.type === "analytics" ? (
                  <BarChart3 className="w-12 h-12 text-green-400" />
                ) : (
                  <Store className="w-12 h-12 text-green-400" />
                )}
              </div>
              <div className="text-lg font-semibold">{cafe.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* PIN Entry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md bg-gray-900/95 backdrop-blur-xl border border-gray-700 shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <div
              className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
                selectedCafeData?.type === "analytics"
                  ? "bg-gradient-to-br from-green-600 to-emerald-600"
                  : "bg-gradient-to-br from-green-600 to-teal-600"
              }`}
            >
              {isUnlocking ? (
                <Unlock className="w-8 h-8 text-white animate-pulse" />
              ) : (
                <Lock className="w-8 h-8 text-white" />
              )}
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Access {selectedCafeData?.name}
            </DialogTitle>
            <p className="text-gray-400 text-sm">
              Enter your 4-digit PIN to continue
            </p>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="relative">
              <Input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14 border-2 border-gray-600 focus:border-green-500 focus:ring-green-500 rounded-xl bg-gray-800/80 backdrop-blur-sm transition-all duration-300 text-white placeholder-gray-500"
                onKeyPress={(e) => e.key === "Enter" && handleUnlock()}
                disabled={isUnlocking}
              />
              <div className="flex justify-center mt-2 space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      i < pin.length
                        ? selectedCafeData?.type === "analytics"
                          ? "bg-green-500 scale-110 shadow-lg shadow-green-500/50"
                          : "bg-green-500 scale-110 shadow-lg shadow-green-500/50"
                        : "bg-gray-600"
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleUnlock}
              disabled={pin.length !== 4 || isUnlocking || isSubmitting}
              className={`w-full h-12 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:opacity-50 ${
                selectedCafeData?.type === "analytics"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-500/25"
                  : "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 shadow-green-500/25"
              }`}
            >
              {isUnlocking ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Validating PIN...</span>
                </div>
              ) : (
                `Access ${
                  selectedCafeData?.type === "analytics"
                    ? "Analytics"
                    : "Gaming Cafe"
                }`
              )}
            </Button>

            {error && (
              <p className="text-center text-amber-400 text-sm animate-pulse">
                {error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-8px);
          }
          40%,
          80% {
            transform: translateX(8px);
          }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
