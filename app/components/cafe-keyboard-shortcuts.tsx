"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccess } from "@/app/context/AccessContext"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  RESERVED_SHORTCUT_KEYS,
  SHORTCUT_MODIFIER_LABEL,
  SHORTCUT_MODIFIER_LABEL_MAC,
  consoleTypesFromConsoles,
  isMacPlatform,
  readCafeShortcuts,
  resetCafeShortcuts,
  saveCafeShortcuts,
  type CafeShortcutMap,
} from "@/app/lib/cafe-shortcuts"

export function CafeKeyboardShortcuts() {
  const { selectedCafeId, activeStaff, can } = useAccess()
  const { consoles, consolesLoading } = useDashboardData()
  const types = useMemo(() => consoleTypesFromConsoles(consoles), [consoles])
  const [shortcuts, setShortcuts] = useState<CafeShortcutMap>({})
  const [message, setMessage] = useState("")
  const [isMac, setIsMac] = useState(false)
  const editable = !activeStaff || activeStaff.role === "owner" || can("account.manage")
  const modifier = isMac ? SHORTCUT_MODIFIER_LABEL_MAC : `${SHORTCUT_MODIFIER_LABEL} +`

  useEffect(() => setIsMac(isMacPlatform()), [])
  useEffect(() => {
    if (selectedCafeId) setShortcuts(readCafeShortcuts(selectedCafeId, types))
  }, [selectedCafeId, types])

  const update = (type: string, value: string) => {
    const key = value.trim().slice(-1).toLowerCase()
    setShortcuts((current) => ({ ...current, [type]: key || null }))
    setMessage("")
  }

  const problem = (() => {
    const seen = new Map<string, string>()
    for (const { type, name } of types) {
      const key = shortcuts[type]
      if (!key) continue
      if (!/^[a-z0-9]$/.test(key)) return `${name}: use one letter or number.`
      if (RESERVED_SHORTCUT_KEYS[key]) return `${name}: ${RESERVED_SHORTCUT_KEYS[key]}. Pick another key.`
      if (seen.has(key)) return `${name} and ${seen.get(key)} both use ${key.toUpperCase()}.`
      seen.set(key, name)
    }
    return ""
  })()

  const save = () => {
    if (!selectedCafeId || problem) return
    const subset: CafeShortcutMap = {}
    types.forEach(({ type }) => { subset[type] = shortcuts[type] || null })
    setMessage(saveCafeShortcuts(selectedCafeId, subset)
      ? "Shortcuts saved for this café in this browser."
      : "Couldn't save: this browser is blocking site storage.")
  }

  const reset = () => {
    if (!selectedCafeId) return
    resetCafeShortcuts(selectedCafeId)
    setShortcuts(readCafeShortcuts(selectedCafeId, types))
    setMessage("Default shortcuts restored.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Café keyboard shortcuts</CardTitle>
        <CardDescription>
          Press {isMac ? "⌥ Option + ⇧ Shift" : "Alt + Shift"} and a key from any dashboard page to open a new booking with that console
          type preselected. Ctrl/⌘ K still opens Search. Leave a box empty to turn that shortcut off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedCafeId ? <p className="text-sm text-muted-foreground">Select a café to configure shortcuts.</p>
          : types.length === 0 ? <p className="text-sm text-muted-foreground">{consolesLoading ? "Loading your consoles…" : "Add consoles to this café to get booking shortcuts."}</p>
          : <>
          <div className="grid gap-3 sm:grid-cols-2">
            {types.map(({ type, name }) => (
              <label key={type} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <span>Book {name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <kbd className="font-sans">{modifier}</kbd>
                  <input
                    aria-label={`${name} booking shortcut key`}
                    className="h-9 w-14 rounded-md border bg-background text-center font-mono uppercase text-foreground"
                    maxLength={2}
                    placeholder="—"
                    value={shortcuts[type] || ""}
                    disabled={!editable}
                    onChange={(event) => update(type, event.target.value)}
                  />
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Alt+Shift with {Object.keys(RESERVED_SHORTCUT_KEYS).map((key) => key.toUpperCase()).join(", ")} is reserved by the browser. Shortcuts don&apos;t fire while typing in a field.
          </p>
          {(problem || message) && <p role="status" className={problem ? "text-sm text-red-400" : "text-sm text-muted-foreground"}>{problem || message}</p>}
          {editable
            ? <div className="flex gap-2"><Button onClick={save} disabled={Boolean(problem)}>Save shortcuts</Button><Button variant="outline" onClick={reset}>Reset defaults</Button></div>
            : <p className="text-xs text-muted-foreground">Ask the café owner or an account manager to change these shortcuts.</p>}
        </>}
      </CardContent>
    </Card>
  )
}
