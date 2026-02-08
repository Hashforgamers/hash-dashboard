// lib/razorpay.ts
import { RAZORPAY_KEY_ID } from "@/src/config/env"

declare global {
  interface Window {
    Razorpay: any
  }
}

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
  handler: (response: RazorpayResponse) => void
  modal?: {
    ondismiss?: () => void
  }
}

export interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function openRazorpay(options: RazorpayOptions): Promise<void> {
  const loaded = await loadRazorpayScript()
  
  if (!loaded) {
    throw new Error("Failed to load Razorpay SDK")
  }

  const razorpay = new window.Razorpay(options)
  razorpay.open()
}

export function createRazorpayOptions(
  orderId: string,
  amount: number,
  packageName: string,
  onSuccess: (response: RazorpayResponse) => void,
  onDismiss?: () => void
): RazorpayOptions {
  return {
    key: RAZORPAY_KEY_ID,
    amount: amount * 100, // Convert to paise
    currency: "INR",
    name: "Hash for Gamers",
    description: `Subscription: ${packageName}`,
    order_id: orderId,
    prefill: {
      name: "",
      email: "",
      contact: "",
    },
    theme: {
      color: "#10b981", // emerald-500
    },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
    },
  }
}
