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
    escape?: boolean
    backdropclose?: boolean
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
      console.log('✅ Razorpay SDK already loaded')
      resolve(true)
      return
    }

    console.log('📥 Loading Razorpay SDK...')

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    
    script.onload = () => {
      console.log('✅ Razorpay SDK loaded successfully')
      resolve(true)
    }
    
    script.onerror = (error) => {
      console.error('❌ Failed to load Razorpay SDK:', error)
      resolve(false)
    }
    
    document.body.appendChild(script)
  })
}

export async function openRazorpay(options: RazorpayOptions): Promise<void> {
  // Load SDK
  const loaded = await loadRazorpayScript()
  
  if (!loaded) {
    throw new Error("Failed to load Razorpay SDK. Please check your internet connection.")
  }

  // Validate key presence
  if (!options.key) {
    throw new Error("Razorpay key is missing. Please contact support.")
  }

  // Validate key format
  if (!options.key.startsWith('rzp_test_') && !options.key.startsWith('rzp_live_')) {
    throw new Error("Invalid Razorpay key format. Please contact support.")
  }

  // Log payment details (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔑 Razorpay Key:', options.key)
    console.log('🧪 Mode:', options.key.startsWith('rzp_test_') ? 'TEST' : 'LIVE')
    console.log('📦 Order ID:', options.order_id)
    console.log('💰 Amount:', options.amount / 100, 'INR')
    console.log('📝 Description:', options.description)
  }

  try {
    // Initialize Razorpay
    const razorpay = new window.Razorpay(options)
    
    console.log('🚀 Opening Razorpay checkout...')
    
    // Open checkout
    razorpay.open()
    
    console.log('✅ Razorpay checkout opened')
  } catch (error: any) {
    console.error('❌ Error opening Razorpay:', error)
    throw new Error(`Failed to open payment window: ${error.message}`)
  }
}

export function createRazorpayOptions(
  orderId: string,
  amount: number,
  packageName: string,
  keyId: string,
  onSuccess: (response: RazorpayResponse) => void,
  onDismiss?: () => void
): RazorpayOptions {
  // Use key from backend (ensures consistency with backend config)
  const key = keyId || RAZORPAY_KEY_ID
  
  if (!key) {
    throw new Error("Razorpay key not configured. Please check environment variables.")
  }

  console.log('🔧 Creating Razorpay options...')
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Order ID:', orderId)
    console.log('💰 Amount:', amount, 'INR')
    console.log('📦 Package:', packageName)
    console.log('🔑 Using key:', key.slice(0, 15) + '...')
  }

  return {
    key: key,
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
      color: "#10b981",
    },
    // ✅ Wrap handler to ensure execution and catch errors
    handler: function(response: RazorpayResponse) {
      console.log('🎉 Razorpay Payment Handler Triggered!')
      console.log('📦 Payment Response:', {
        order_id: response.razorpay_order_id,
        payment_id: response.razorpay_payment_id,
        signature: response.razorpay_signature ? '✓ Present' : '✗ Missing'
      })
      
      // Validate response
      if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
        console.error('❌ Incomplete payment response:', response)
        alert('Payment verification failed: Incomplete response from payment gateway. Please contact support.')
        return
      }

      try {
        console.log('🔄 Calling success handler...')
        
        // Call the actual success handler
        onSuccess(response)
        
        console.log('✅ Success handler called')
      } catch (error: any) {
        console.error('❌ Error in payment success handler:', error)
        alert(`Payment succeeded but processing failed: ${error.message}. Payment ID: ${response.razorpay_payment_id}. Please contact support.`)
      }
    },
    modal: {
      // ✅ Handle modal dismissal
      ondismiss: function() {
        console.log('🚪 Razorpay modal dismissed')
        
        if (onDismiss) {
          try {
            onDismiss()
          } catch (error) {
            console.error('❌ Error in dismiss handler:', error)
          }
        }
      },
      // ✅ Allow ESC key to close
      escape: true,
      // ✅ Don't close on backdrop click (prevent accidental closes)
      backdropclose: false,
    },
  }
}

// ✅ Utility function to check if Razorpay is loaded
export function isRazorpayLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.Razorpay
}

// ✅ Utility function to get Razorpay mode from key
export function getRazorpayMode(key?: string): 'test' | 'live' | 'unknown' {
  const razorpayKey = key || RAZORPAY_KEY_ID
  
  if (!razorpayKey) return 'unknown'
  if (razorpayKey.startsWith('rzp_test_')) return 'test'
  if (razorpayKey.startsWith('rzp_live_')) return 'live'
  
  return 'unknown'
}
