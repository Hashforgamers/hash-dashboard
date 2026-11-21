"use client"

import { useEffect, useState } from "react"
import { useAccess } from "@/app/context/AccessContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DEFAULT_CAFE_SHORTCUTS,
  cafeShortcutStorageKey,
  normalizeShortcutKey,
  readCafeShortcuts,
  type CafeShortcutMap,
  type CafeShortcutPlatform,
} from "@/app/lib/cafe-shortcuts"

const PLATFORMS: CafeShortcutPlatform[] = ["All", "PC", "PS5", "Xbox", "VR"]

export function CafeKeyboardShortcuts() {
  const { selectedCafeId, activeStaff, can } = useAccess()
  const [shortcuts, setShortcuts] = useState<CafeShortcutMap>({ ...DEFAULT_CAFE_SHORTCUTS })
  const [message, setMessage] = useState("")
  const editable = !activeStaff || activeStaff.role === "owner" || can("account.manage")

  useEffect(() => {
    if (selectedCafeId) setShortcuts({ ...readCafeShortcuts(selectedCafeId) })
  }, [selectedCafeId])

  const update = (platform: CafeShortcutPlatform, value: string) => {
    const key = normalizeShortcutKey(value)
    setShortcuts((current) => ({ ...current, [platform]: key }))
    setMessage("")
  }

  const save = () => {
    if (!selectedCafeId) return
    const values = PLATFORMS.map((platform) => shortcuts[platform])
    if (values.some((key) => !/^[a-z0-9]$/.test(key))) {
      setMessage("Choose one letter or number for each shortcut.")
      return
    }
    if (new Set(values).size !== values.length) {
      setMessage("Each platform needs a different key.")
      return
    }
    if (values.includes("k")) {
      setMessage("Ctrl+K is reserved for Search.")
      return
    }
    localStorage.setItem(cafeShortcutStorageKey(selectedCafeId), JSON.stringify(shortcuts))
    setMessage("Keyboard shortcuts saved for this café on this device.")
  }

  const reset = () => {
    setShortcuts({ ...DEFAULT_CAFE_SHORTCUTS })
    setMessage("")
    if (selectedCafeId) localStorage.removeItem(cafeShortcutStorageKey(selectedCafeId))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Café keyboard shortcuts</CardTitle>
        <CardDescription>Set Ctrl+key shortcuts to switch the booking schedule to a platform. Select an available slot to open its booking form.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCafeId ? <p className="text-sm text-muted-foreground">Select a café to configure shortcuts.</p> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <span>{platform === "All" ? "All consoles booking schedule" : `${platform} booking schedule`}</span>
                <span className="flex items-center gap-2 text-muted-foreground"><kbd>Ctrl</kbd>+<input aria-label={`${platform} shortcut key`} className="h-9 w-14 rounded-md border bg-background text-center font-mono uppercase text-foreground" maxLength={1} value={shortcuts[platform]} disabled={!editable} onChange={(event) => update(platform, event.target.value)} /></span>
              </label>
            ))}
          </div>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          {editable ? <div className="flex gap-2"><Button onClick={save}>Save shortcuts</Button><Button variant="outline" onClick={reset}>Reset defaults</Button></div> : <p className="text-xs text-muted-foreground">Ask the café owner or an account manager to change these shortcuts.</p>}
        </>}
      </CardContent>
    </Card>
  )
}
