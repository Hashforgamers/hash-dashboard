"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Confirmation = { title: string; description: string; action: string }

export function useActionFeedback() {
  const [error, setError] = useState("")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => () => resolveRef.current?.(false), [])

  const finish = (accepted: boolean) => {
    resolveRef.current?.(accepted)
    resolveRef.current = null
    setConfirmation(null)
  }
  const confirmAction = (options: Confirmation) => new Promise<boolean>((resolve) => {
    resolveRef.current?.(false)
    resolveRef.current = resolve
    setError("")
    setConfirmation(options)
  })

  const feedback = <>
    {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
      <span>{error}</span>
      <button type="button" onClick={() => setError("")} className="shrink-0 underline">Dismiss</button>
    </div>}
    <Dialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open) finish(false) }}>
      <DialogContent onOpenAutoFocus={(event) => {
        event.preventDefault()
        cancelRef.current?.focus()
      }}>
        <DialogTitle>{confirmation?.title}</DialogTitle>
        <DialogDescription>{confirmation?.description}</DialogDescription>
        <DialogFooter>
          <Button ref={cancelRef} variant="outline" onClick={() => finish(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => finish(true)}>{confirmation?.action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  return { error, reportError: (message: string) => setError(message), clearError: () => setError(""), confirmAction, feedback }
}
