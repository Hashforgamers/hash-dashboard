"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LogOut, Settings } from "lucide-react"
import { toast } from "sonner"
import { useAccess } from "@/app/context/AccessContext"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PrivatePin } from "../private-pin"
import { logoutStaff } from "../log-out"

const roleLabel = (role?: string) => role === "owner" ? "Owner" : role === "manager" ? "Manager" : role ? "Staff" : ""

export function ProfileMenu() {
  const router = useRouter()
  const { activeStaff, setActiveByPin, can } = useAccess()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pin, setPin] = useState("")

  const name = activeStaff?.name || (activeStaff?.role === "owner" ? "Owner" : "")
  const initials = (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?"

  const handleSwitchUser = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be 4 digits")
      return
    }
    const result = await setActiveByPin(pin)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setPinDialogOpen(false)
    setPin("")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            title={activeStaff ? `${activeStaff.name} · ${roleLabel(activeStaff.role)}` : "Loading active session"}
            className="shell-profile-trigger"
          >
            <span className="shell-avatar" aria-hidden="true">{activeStaff ? initials : ""}</span>
            <span className="hidden min-w-0 flex-col items-start leading-tight lg:flex">
              <span className="max-w-[120px] truncate text-[13px] font-medium text-foreground">{activeStaff ? name : "Loading…"}</span>
              {roleLabel(activeStaff?.role) !== name && <span className="text-[11px] text-muted-foreground">{roleLabel(activeStaff?.role)}</span>}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60">
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <span className="shell-avatar" aria-hidden="true">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{activeStaff ? name : "Loading user…"}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">{roleLabel(activeStaff?.role) || "—"}</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {can("account.manage") && (
            <DropdownMenuItem onSelect={() => router.push("/account")}>
              <Settings className="mr-2 h-4 w-4" />Account settings
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setPinDialogOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />Switch user (PIN)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logoutStaff()} className="text-red-300 focus:bg-red-500/10 focus:text-red-200">
            <LogOut className="mr-2 h-4 w-4" />Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pinDialogOpen} onOpenChange={open=>{setPinDialogOpen(open);setPin("");}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch Active User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter owner or employee PIN to switch dashboard access level.</p>
            <PrivatePin value={pin} onChange={setPin} onEnter={()=>void handleSwitchUser()}/>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => {setPinDialogOpen(false);setPin("");}}>
                Cancel
              </Button>
              <Button onClick={() => void handleSwitchUser()} disabled={pin.length !== 4}>
                Switch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
