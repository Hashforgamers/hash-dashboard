"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Store } from "lucide-react"
import { useAccess } from "@/app/context/AccessContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CafeOption { id: string; name: string }

/**
 * Venue switcher. Same data as the old sidebar card (the `vendors` list saved at login);
 * switching still goes through /select-cafe, which owns the PIN unlock.
 */
export function CafePicker() {
  const router = useRouter()
  const { selectedCafeId } = useAccess()
  const [cafes, setCafes] = useState<CafeOption[]>([])

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("vendors") || "[]")
      setCafes(Array.isArray(parsed) ? parsed.map((c: any) => ({ id: String(c.id), name: String(c.cafe_name || "").trim() || `Café #${c.id}` })) : [])
    } catch {
      setCafes([])
    }
  }, [selectedCafeId])

  const current = cafes.find((c) => c.id === String(selectedCafeId))
  const cafeName = current?.name || (selectedCafeId ? `Café #${selectedCafeId}` : "Select café")
  const switchCafe = () => router.push("/select-cafe")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="shell-cafe-trigger" aria-label={`Switch café: ${cafeName}`} title={`Switch café: ${cafeName}`}>
          <span className="shell-cafe-icon" aria-hidden="true"><Store className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 truncate text-[13px] font-medium text-foreground">{cafeName}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Your cafés</DropdownMenuLabel>
        {cafes.length === 0 && <DropdownMenuItem disabled>No cafés saved on this device</DropdownMenuItem>}
        {cafes.map((cafe) => {
          const active = cafe.id === String(selectedCafeId)
          return (
            <DropdownMenuItem key={cafe.id} onSelect={active ? undefined : switchCafe} className="gap-2">
              <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{cafe.name}</span>
              {active ? <Check className="h-4 w-4 text-primary" /> : <span className="text-[11px] text-muted-foreground">PIN</span>}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={switchCafe}>Manage cafés…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
