"use client"
import { useState } from "react"
import { Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { initials, seedHue } from "./library"
import styles from "./games.module.css"

/** Full-bleed cover art, or a gradient tile seeded from the name when there is none (or it fails to load). */
export function GameCover({ name, src, className, size = "md" }: { name: string; src?: string | null; className?: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn(styles.coverImg, className)} />
    )
  }
  const hue = seedHue(name)
  return (
    <div aria-hidden className={cn(styles.coverFallback, styles[`fallback_${size}`], className)}
      style={{ ["--cover-hue" as string]: hue, ["--cover-hue-2" as string]: (hue + 48) % 360 }}>
      <Gamepad2 className={styles.fallbackIcon} />
      <span className={styles.fallbackInitials}>{initials(name)}</span>
    </div>
  )
}
