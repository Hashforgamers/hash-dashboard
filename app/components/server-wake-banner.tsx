"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { BOOKING_URL, DASHBOARD_URL, LOGIN_URL } from "@/src/config/env"

// The backends sleep when idle and take ~30s to wake. Ping them on load and after the tab has been
// away for a while; if any is slow to answer, say so instead of leaving pages looking stuck.
const SLOW_AFTER_MS = 3000
const AWAY_LONG_MS = 10 * 60 * 1000
const GIVE_UP_MS = 90 * 1000

async function ping(base: string) {
  // no-cors: any HTTP answer (even an error page) proves the server is awake
  await fetch(base, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => undefined)
}

export function ServerWakeBanner() {
  const [waking, setWaking] = useState(false)
  const hiddenAt = useRef<number | null>(null)

  useEffect(() => {
    const bases = [LOGIN_URL, DASHBOARD_URL, BOOKING_URL].filter(Boolean)
    if (!bases.length) return
    let cancelled = false

    const check = () => {
      const slowTimer = window.setTimeout(() => { if (!cancelled) setWaking(true) }, SLOW_AFTER_MS)
      const giveUp = window.setTimeout(() => { if (!cancelled) setWaking(false) }, GIVE_UP_MS)
      void Promise.all(bases.map(ping)).finally(() => {
        window.clearTimeout(slowTimer)
        window.clearTimeout(giveUp)
        if (!cancelled) setWaking(false)
      })
    }

    const onVisibility = () => {
      if (document.hidden) { hiddenAt.current = Date.now(); return }
      if (hiddenAt.current && Date.now() - hiddenAt.current > AWAY_LONG_MS) check()
      hiddenAt.current = null
    }

    check()
    document.addEventListener("visibilitychange", onVisibility)
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisibility) }
  }, [])

  if (!waking) return null
  return (
    <div role="status" aria-live="polite"
      className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-[30000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-popover/90 px-4 py-2 text-sm text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />
      Starting up the server. This can take about 30 seconds.
    </div>
  )
}
