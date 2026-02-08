"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { subscriptionApi } from "@/lib/api"
import { openRazorpay, createRazorpayOptions, RazorpayResponse } from "@/lib/razorpay"
import { useSubscription } from "@/hooks/useSubscription"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Loader2, Sparkles, Crown, Zap, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Package {
  id: number
  code: string
  name: string
  pc_limit: number
  price: number
  original_price: number
  is_free: boolean
  description: string
  features: any
}

interface FailedPayment {
  paymentId: string
  orderId: string
  signature: string
  packageCode: string
  packageName: string
  amount: number
}

export default function SubscriptionPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [currentSubscription, setCurrentSubscription] = useState<any>(null)
  const [failedPayment, setFailedPayment] = useState<FailedPayment | null>(null)
  const [retrying, setRetrying] = useState(false)
  const { vendorId, refreshStatus } = useSubscription()
  const router = useRouter()

  // Check vendor selection first
  useEffect(() => {
    const selectedCafe = localStorage.getItem("selectedCafe")
    
    if (!selectedCafe) {
      toast.error("Please select a cafe first")
      router.push("/select-cafe")
      return
    }
    
    if (selectedCafe === "master") {
      toast.info("Master analytics doesn't require subscription")
      router.push("/master")
      return
    }
  }, [router])

  // Fetch packages and current subscription
  useEffect(() => {
    if (!vendorId) return
    loadData()
  }, [vendorId])

  async function loadData() {
    if (!vendorId) return

    try {
      setLoading(true)
      
      // Fetch packages
      const packagesResponse = await subscriptionApi.getPackages()
      
      if (!packagesResponse.packages || packagesResponse.packages.length === 0) {
        toast.error("No packages available")
        return
      }
      
      setPackages(packagesResponse.packages)

      // Fetch current subscription
      try {
        const subResponse = await subscriptionApi.getSubscription(vendorId)
        if (subResponse.status !== "none") {
          setCurrentSubscription(subResponse)
        }
      } catch (error) {
        // No subscription - that's okay for first time users
        console.log("No existing subscription found")
      }
    } catch (error: any) {
      console.error("Failed to load data:", error)
      toast.error(error.message || "Failed to load packages. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(pkg: Package) {
    if (!vendorId) {
      toast.error("Vendor not selected")
      return
    }

    if (pkg.is_free || pkg.price === 0) {
      toast.info("This is a free package. Contact support for activation.")
      return
    }

    setProcessing(pkg.code)

    try {
      const action = currentSubscription ? "renew" : "new"

      console.log('🔵 Initiating payment for:', {
        vendor: vendorId,
        package: pkg.code,
        action
      })

      toast.info("Creating payment order...")
      const orderResponse = await subscriptionApi.createOrder(vendorId, pkg.code, action)

      console.log('📦 Order Response:', orderResponse)

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || "Failed to create order")
      }

      // Store payment context for handler
      const paymentContext = {
        vendorId,
        packageCode: pkg.code,
        packageName: pkg.name,
        amount: orderResponse.amount,
        action,
        keyId: orderResponse.key_id
      }

      console.log('💾 Payment Context:', paymentContext)

      // Create Razorpay options with wrapped handlers
      const options = createRazorpayOptions(
        orderResponse.order_id,
        orderResponse.amount,
        pkg.name,
        orderResponse.key_id,
        async (response: RazorpayResponse) => {
          // Success handler - payment completed
          console.log('✅ Payment Success Handler Called')
          console.log('📦 Razorpay Response:', response)
          
          try {
            await verifyAndActivate(
              response, 
              paymentContext.packageCode, 
              paymentContext.packageName,
              paymentContext.amount,
              paymentContext.action
            )
          } catch (error: any) {
            console.error('❌ Verification failed in handler:', error)
            
            // Save failed payment for retry
            setFailedPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              packageCode: paymentContext.packageCode,
              packageName: paymentContext.packageName,
              amount: paymentContext.amount
            })
            
            toast.error(
              `Payment succeeded but verification failed. Payment ID: ${response.razorpay_payment_id.slice(0, 20)}...`,
              { duration: 10000 }
            )
          }
        },
        () => {
          // Dismiss handler - payment cancelled
          console.log('❌ Payment Dismissed/Cancelled')
          setProcessing(null)
          toast.info("Payment cancelled")
        }
      )

      console.log('⚙️ Opening Razorpay with options:', {
        ...options,
        key: options.key.slice(0, 15) + '...' // Mask key in logs
      })

      await openRazorpay(options)
    } catch (error: any) {
      console.error("❌ Payment error:", error)
      toast.error(error.message || "Failed to process payment")
      setProcessing(null)
    }
  }

  async function verifyAndActivate(
    paymentResponse: RazorpayResponse,
    packageCode: string,
    packageName: string,
    amount: number,
    action: "new" | "renew"
  ) {
    try {
      console.log('🔵 Starting payment verification...')
      console.log('📦 Payment Response:', paymentResponse)
      console.log('📦 Package:', packageCode)
      console.log('📦 Action:', action)
      console.log('📦 Vendor:', vendorId)
      
      toast.info("Verifying payment...")
      
      const verifyResponse = await subscriptionApi.verifyPayment(vendorId!, {
        ...paymentResponse,
        package_code: packageCode,
        action,
      })

      console.log('🟢 Verify Response:', verifyResponse)

      if (verifyResponse.success) {
        toast.success("Subscription activated successfully! 🎉")
        
        // Clear any failed payment state
        setFailedPayment(null)
        
        // Refresh subscription status
        await refreshStatus()
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
      } else {
        console.error('❌ Verification failed:', verifyResponse)
        throw new Error(verifyResponse.error || "Verification failed")
      }
    } catch (error: any) {
      console.error("❌ Verification error:", error)
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack
      })
      
      // Re-throw to be caught by payment handler
      throw error
    } finally {
      setProcessing(null)
    }
  }

  async function retryVerification() {
    if (!failedPayment || !vendorId) return

    setRetrying(true)

    try {
      console.log('🔄 Retrying verification for:', failedPayment)
      
      toast.info("Retrying payment verification...")
      
      const verifyResponse = await subscriptionApi.verifyPayment(vendorId, {
        razorpay_order_id: failedPayment.orderId,
        razorpay_payment_id: failedPayment.paymentId,
        razorpay_signature: failedPayment.signature,
        package_code: failedPayment.packageCode,
        action: "new"
      })

      console.log('🟢 Retry Response:', verifyResponse)

      if (verifyResponse.success) {
        toast.success("Subscription activated successfully! 🎉")
        setFailedPayment(null)
        await refreshStatus()
        setTimeout(() => router.push("/dashboard"), 2000)
      } else {
        throw new Error(verifyResponse.error || "Verification failed")
      }
    } catch (error: any) {
      console.error("❌ Retry failed:", error)
      toast.error(
        `Retry failed: ${error.message}. Please contact support with Payment ID: ${failedPayment.paymentId}`,
        { duration: 10000 }
      )
    } finally {
      setRetrying(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    )
  }

  // No packages state
  if (packages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Packages Available</CardTitle>
            <CardDescription>
              There are no subscription packages available at the moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select the perfect subscription plan for your gaming cafe
          </p>
        </div>

        {/* Failed Payment Alert */}
        {failedPayment && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Verification Failed</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  Your payment of ₹{failedPayment.amount} for <strong>{failedPayment.packageName}</strong> was successful, 
                  but we couldn't verify it automatically.
                </p>
                <p className="text-xs font-mono bg-background/50 p-2 rounded">
                  Payment ID: {failedPayment.paymentId}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={retryVerification} 
                    disabled={retrying}
                    size="sm"
                    variant="outline"
                  >
                    {retrying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Verification
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(failedPayment.paymentId)
                      toast.success("Payment ID copied to clipboard")
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Copy Payment ID
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Current Subscription Status */}
        {currentSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-xl font-bold">{currentSubscription.package?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentSubscription.has_active ? (
                        <>Expires: {new Date(currentSubscription.period_end).toLocaleDateString()}</>
                      ) : (
                        <span className="text-destructive font-medium">Expired</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">PC Limit</p>
                    <p className="text-2xl font-bold">{currentSubscription.pc_limit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  pkg.code === currentSubscription?.package?.code
                    ? "border-primary shadow-lg"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Popular Badge */}
                {pkg.code === "grow" && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Popular
                    </div>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">₹{pkg.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {pkg.original_price !== pkg.price && (
                      <p className="text-sm text-muted-foreground line-through">
                        ₹{pkg.original_price}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Up to {pkg.pc_limit} PCs/Consoles</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Real-time booking management</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Analytics dashboard</span>
                    </div>
                    {pkg.code !== "early_onboard" && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Priority support</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleSubscribe(pkg)}
                    disabled={processing !== null || pkg.is_free}
                    className={`w-full ${
                      pkg.code === "grow"
                        ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        : ""
                    }`}
                    size="lg"
                  >
                    {processing === pkg.code ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : pkg.code === currentSubscription?.package?.code ? (
                      "Current Plan"
                    ) : pkg.is_free ? (
                      "Contact Support"
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Dev Mode Notice - Only show if price is 1 */}
        {packages.length > 0 && packages[0].price === 1 && (
          <div className="text-center text-sm text-muted-foreground">
            <p>🔧 Testing Mode: Subscriptions are ₹1 for 1 day</p>
          </div>
        )}

        {/* Back to Dashboard Button */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
