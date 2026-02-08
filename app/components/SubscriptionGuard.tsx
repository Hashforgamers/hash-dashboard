"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSubscription } from "@/hooks/useSubscription"
import { Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { status, loading, vendorId, checkSubscription } = useSubscription()
  const router = useRouter()
  const pathname = usePathname()

  // ✅ Check subscription when guard mounts
  useEffect(() => {
    if (vendorId) {
      checkSubscription()
    }
  }, [vendorId])

  // ✅ Show loading only if actually checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    )
  }

  // ✅ Show locked state only if actually locked
  if (status?.locked && vendorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Subscription Expired</h1>
            <p className="text-muted-foreground">{status.message}</p>
          </div>

          <Button
            onClick={() => router.push("/subscription")}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            Renew Subscription
          </Button>
        </div>
      </div>
    )
  }

  // ✅ Subscription is active or not checked yet - render children
  return <>{children}</>
}
