// lib/api.ts
import { DASHBOARD_URL } from "@/src/config/env"

export interface ApiResponse<T = any> {
  success?: boolean
  status?: string
  data?: T
  message?: string
  error?: string
}

export async function apiCall<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    // ✅ Add timestamp to prevent caching
    const separator = endpoint.includes('?') ? '&' : '?'
    const url = `${DASHBOARD_URL}${endpoint}${separator}t=${Date.now()}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      // ✅ Add credentials for CORS
      credentials: 'omit', // or 'include' if you need cookies
    })

    // ✅ Handle non-JSON responses (like 308 redirects)
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Non-JSON response: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed: ${response.status}`)
    }

    return data
  } catch (error: any) {
    console.error("API call failed:", endpoint, error)
    
    // ✅ Better error messages
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Network error. Please check your connection.")
    }
    
    throw error
  }
}

// Subscription API calls
export const subscriptionApi = {
  // Check if subscription is active
  checkStatus: (vendorId: number) =>
    apiCall(`/api/vendors/${vendorId}/subscription/status`),

  // Get subscription details
  getSubscription: (vendorId: number) =>
    apiCall(`/api/vendors/${vendorId}/subscription/`),

  // Get all packages
  getPackages: () => apiCall("/api/packages"),

  // Create Razorpay order
  createOrder: (vendorId: number, packageCode: string, action: "new" | "renew" = "new") =>
    apiCall(`/api/vendors/${vendorId}/subscription/create-order`, {
      method: "POST",
      body: JSON.stringify({ package_code: packageCode, action }),
    }),

  // Verify payment and activate subscription
  verifyPayment: (
    vendorId: number,
    paymentData: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
      package_code: string
      action: "new" | "renew"
    }
  ) =>
    apiCall(`/api/vendors/${vendorId}/subscription/verify-payment`, {
      method: "POST",
      body: JSON.stringify(paymentData),
    }),

  // Get subscription history
  getHistory: (vendorId: number) =>
    apiCall(`/api/vendors/${vendorId}/subscription/history`),
}
