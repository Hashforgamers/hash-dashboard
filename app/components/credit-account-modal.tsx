"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Wallet, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { BOOKING_URL } from "@/src/config/env"

export interface MonthlyCreditAccountSummary {
  id?: number
  user_id?: number
  credit_limit: number
  outstanding_amount: number
  billing_cycle_day: number
  grace_days?: number
  is_active?: boolean
  notes?: string | null
  customer_name?: string | null
  whatsapp_number?: string | null
  phone_number?: string | null
  email?: string | null
}

export interface CreditCustomerProfile {
  userId?: number | null
  name: string
  email?: string
  phone?: string
}

interface CreditAccountModalProps {
  open: boolean
  vendorId: number | null
  customer: CreditCustomerProfile
  onClose: () => void
  onCreated: (payload: { account: MonthlyCreditAccountSummary; user: CreditCustomerProfile }) => void
}

const MAX_BILLING_CYCLE_DAY = 31

const authHeaders = () => {
  const token = localStorage.getItem("rbac_access_token_v1") || localStorage.getItem("jwtToken")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function CreditAccountModal({ open, vendorId, customer, onClose, onCreated }: CreditAccountModalProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    credit_limit: "",
    billing_cycle_day: "1",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setForm((prev) => ({
      ...prev,
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
    }))
    setError("")
  }, [open, customer])

  const canSubmit = useMemo(() => {
    return Boolean(
      vendorId &&
      form.name.trim() &&
      (form.phone.trim() || form.email.trim()) &&
      Number(form.credit_limit) >= 0 &&
      Number(form.billing_cycle_day) >= 1 &&
      Number(form.billing_cycle_day) <= MAX_BILLING_CYCLE_DAY
    )
  }, [vendorId, form])

  const handleConfirm = async () => {
    if (!vendorId || !canSubmit) return
    setSaving(true)
    setError("")
    try {
      let resolvedUserId = customer.userId ? Number(customer.userId) : 0
      if (!resolvedUserId) {
        const userRes = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          }),
        })
        const userData = await userRes.json()
        if (!userRes.ok || !userData?.success || !userData?.user?.id) {
          throw new Error(userData?.message || userData?.error || "Unable to create or resolve customer")
        }
        resolvedUserId = Number(userData.user.id)
      }

      const accountPayload = {
        user_id: resolvedUserId,
        credit_limit: Number(form.credit_limit || 0),
        billing_cycle_day: Number(form.billing_cycle_day || 1),
        notes: form.notes.trim(),
        customer_name: form.name.trim(),
        phone_number: form.phone.trim(),
        whatsapp_number: form.phone.trim(),
        email: form.email.trim(),
        is_active: true,
      }

      const accountRes = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(accountPayload),
      })
      const accountData = await accountRes.json()
      if (!accountRes.ok || !accountData?.success) {
        throw new Error(accountData?.message || accountData?.error || "Unable to save credit account")
      }

      const listRes = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`, {
        method: "GET",
        headers: authHeaders(),
      })
      const listData = await listRes.json()
      const savedAccount = Array.isArray(listData?.accounts)
        ? listData.accounts.find((row: any) => Number(row.user_id) === resolvedUserId)
        : null

      onCreated({
        account: {
          credit_limit: Number(savedAccount?.credit_limit || accountPayload.credit_limit),
          outstanding_amount: Number(savedAccount?.outstanding_amount || 0),
          billing_cycle_day: Number(savedAccount?.billing_cycle_day || accountPayload.billing_cycle_day),
          grace_days: Number(savedAccount?.grace_days || 5),
          is_active: Boolean(savedAccount?.is_active ?? true),
          notes: savedAccount?.notes || accountPayload.notes,
          user_id: resolvedUserId,
          id: savedAccount?.id,
          customer_name: savedAccount?.customer_name || accountPayload.customer_name,
          phone_number: savedAccount?.phone_number || accountPayload.phone_number,
          whatsapp_number: savedAccount?.whatsapp_number || accountPayload.whatsapp_number,
          email: savedAccount?.email || accountPayload.email,
        },
        user: {
          userId: resolvedUserId,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || "Unable to create credit account")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="credit-account-modal w-full max-w-lg rounded-2xl border shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="credit-account-modal-header flex items-start justify-between px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="slot-booking-modal-accent rounded-xl p-2">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Create Credit Account</h3>
                  <p className="text-sm text-slate-400">Verify customer details and enable monthly credit.</p>
                </div>
              </div>
              <button onClick={onClose} className="slot-booking-modal-close rounded-md p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Customer Name</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Email</label>
                  <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Credit Limit (₹)</label>
                  <input type="number" min={0} value={form.credit_limit} onChange={(e) => setForm((p) => ({ ...p, credit_limit: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Billing Cycle Day</label>
                  <input type="number" min={1} max={MAX_BILLING_CYCLE_DAY} value={form.billing_cycle_day} onChange={(e) => setForm((p) => ({ ...p, billing_cycle_day: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" placeholder="Optional notes" />
                </div>
              </div>
              {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}
            </div>
            <div className="credit-account-modal-footer flex items-center justify-end gap-2 px-5 py-4">
              <button onClick={onClose} className="slot-booking-modal-secondary rounded-lg px-4 py-2 text-sm">Cancel</button>
              <button onClick={handleConfirm} disabled={!canSubmit || saving} className="ui-action-primary rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
                <span className="inline-flex items-center gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Confirm</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
