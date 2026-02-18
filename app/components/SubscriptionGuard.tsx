"use client"

import { useSubscription } from "@/hooks/useSubscription"

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
