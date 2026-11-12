"use client"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

// Presentational pieces of the Settings screen. They live outside MyAccount so they aren't
// re-created (and their state reset) every time the settings screen re-renders.

export const UpdatingOverlay = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
    >
      <div className="bg-card border border-border rounded-lg p-8 shadow-2xl max-w-md mx-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Animated Spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted rounded-full animate-spin border-t-primary"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary/30"></div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground">
            Updating Operating Hours
          </h3>
          
          {/* Description */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Please wait while we update your slot configurations.</p>
            <p className="font-medium text-amber-400">
              This process may take 2-3 minutes.
            </p>
            <p>Please do not close this window or navigate away.</p>
          </div>
          
          {/* Progress Dots */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ToggleSwitch = ({ 
  enabled, 
  onToggle, 
  disabled = false, 
  loading = false,
  size = "default" 
}: any) => {
  const sizeClasses = {
    sm: "w-8 h-4",
    default: "w-11 h-6",
    lg: "w-14 h-7"
  };

  const thumbSizeClasses = {
    sm: "w-3 h-3",
    default: "w-5 h-5", 
    lg: "w-6 h-6"
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        sizeClasses[size as keyof typeof sizeClasses],
        enabled 
          ? "bg-primary" 
          : "bg-zinc-200 dark:bg-zinc-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      role="switch"
      aria-checked={enabled}
    >
      <span className="sr-only">Toggle setting</span>
      <span
        className={cn(
          "pointer-events-none relative inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out",
          thumbSizeClasses[size as keyof typeof thumbSizeClasses],
          enabled 
            ? size === "sm" ? "translate-x-4" : size === "lg" ? "translate-x-7" : "translate-x-5"
            : "translate-x-0"
        )}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className={cn(
              "animate-spin text-zinc-400",
              size === "sm" ? "w-2 h-2" : size === "lg" ? "w-4 h-4" : "w-3 h-3"
            )} />
          </div>
        )}
      </span>
    </button>
  );
};
