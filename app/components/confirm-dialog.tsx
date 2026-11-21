"use client"

import { useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmRequest = { message: string; resolve: (ok: boolean) => void }

let showConfirm: ((request: ConfirmRequest) => void) | null = null

/** Styled drop-in for window.confirm: `if (!(await confirmDialog("Delete X?"))) return` */
export function confirmDialog(message: string): Promise<boolean> {
  // shortcut: falls back to the native box where the host isn't mounted (the public /play route)
  if (!showConfirm) return Promise.resolve(window.confirm(message))
  return new Promise((resolve) => showConfirm!({ message, resolve }))
}

export function ConfirmDialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    showConfirm = setRequest
    return () => { showConfirm = null }
  }, [])

  // a promise ignores a second resolve, so Escape/overlay (false) after a click (true) is harmless
  const close = (ok: boolean) => {
    request?.resolve(ok)
    setRequest(null)
  }
  const destructive = /\b(delete|remove)\b/i.test(request?.message || "")

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => { if (!open) close(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{destructive ? "This can't be undone" : "Please confirm"}</AlertDialogTitle>
          <AlertDialogDescription>{request?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={destructive ? "bg-red-700 text-white hover:bg-red-800" : undefined}
          >
            {destructive ? "Delete" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
