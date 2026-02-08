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
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => {
      console.log('✅ Razorpay SDK loaded')
      resolve(true)
    }
    script.onerror = () => {
      console.error('❌ Failed to load Razorpay SDK')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

export async function openRazorpay(options: RazorpayOptions): Promise<void> {
  const loaded = await loadRazorpayScript()
  
  if (!loaded) {
    throw new Error("Failed to load Razorpay SDK")
  }

  if (!options.key) {
    throw new Error("Razorpay key is missing")
  }

  // ✅ Validate key format
  if (!options.key.startsWith('rzp_test_') && !options.key.startsWith('rzp_live_')) {
    throw new Error("Invalid Razorpay key format")
  }

  console.log('🔑 Razorpay Key:', options.key)
  console.log('🧪 Test Mode:', options.key.startsWith('rzp_test_'))
  console.log('📦 Order ID:', options.order_id)
  console.log('💰 Amount:', options.amount / 100, 'INR')

  const razorpay = new window.Razorpay(options)
  razorpay.open()
}

export function createRazorpayOptions(
  orderId: string,
  amount: number,
  packageName: string,
  keyId: string,  // ✅ ADD: Pass key from backend
  onSuccess: (response: RazorpayResponse) => void,
  onDismiss?: () => void
): RazorpayOptions {
  // ✅ Use key from backend (ensures consistency)
  const key = keyId || RAZORPAY_KEY_ID
  
  if (!key) {
    throw new Error("Razorpay key not configured")
  }

  return {
    key: key,  // ✅ Use the passed key
    amount: amount * 100,
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
      color: "#10b981",
    },
    handler: onSuccess,
    modal: {
      ondismiss: onDismiss,
    },
  }
}
