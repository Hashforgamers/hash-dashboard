"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Bell, X, Check, Clock, User, Calendar, Wallet, Gamepad2, FileWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BOOKING_URL } from '@/src/config/env'


interface PayAtCafeNotification {
  kind?: "pay_at_cafe"
  notification_id?: string
  event_id: string
  emitted_at: string
  bookingId: number
  booking_ids?: number[]
  slotId: number
  slot_ids?: number[]
  vendorId: number
  userId: number
  username: string
  game: {
    vendor_id: number
    single_slot_price: number
    game_name: string
  }
  game_id: number
  consoleType: string
  consoleNumber: string
  date: string
  batch_id?: string
  slot_count?: number
  total_amount?: number
  slot_price: {
    vendor_id: number
    single_slot_price: number
    game_name: string
  }
  status: string
  statusLabel: string
  booking_status: string
  time: string
  processed_time: string
}

interface MealsAddedNotification {
  kind: "meals_added"
  notification_id: string
  emitted_at?: string
  bookingId: number
  vendorId: number
  username?: string
  amount_added?: number
}

interface DocumentStatusNotification {
  kind: "document_status"
  notification_id: string
  emitted_at?: string
  vendorId: number
  statusType: "verified" | "rejected"
  title: string
  message: string
}

type DashboardNotification = PayAtCafeNotification | MealsAddedNotification | DocumentStatusNotification

interface PayAtCafeQueueSummary {
  requested: number
  pending: number
  accepted: number
  rejected: number
  auto_accepted: number
  auto_rejected: number
}

type QueueFilterMode = "single" | "range"
type QueueStatusKey = "requested" | "pending" | "accepted" | "rejected" | "auto_accepted" | "auto_rejected"

interface PayAtCafeQueueItem {
  booking_id: number
  user_id: number
  username: string
  phone?: string | null
  email?: string | null
  game_name: string
  date: string
  time: string
  amount: number
  action_source?: string | null
  action_at?: string | null
}

interface NotificationPanelProps {
  vendorId: number | null
  isOpen: boolean
  onClose: () => void
  notifications: DashboardNotification[]
  payAtCafeSummary?: PayAtCafeQueueSummary | null
  onRemoveNotification: (bookingId: number | string) => void
  socket?: any
  onBookingAccepted?: (bookingData: any) => void
}


export function NotificationPanel({
  vendorId,
  isOpen,
  onClose,
  notifications,
  payAtCafeSummary,
  onRemoveNotification,
  socket,
  onBookingAccepted
}: NotificationPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [processingAction, setProcessingAction] = useState<{
    bookingId: number | null
    action: 'accept' | 'reject' | null
  }>({
    bookingId: null,
    action: null
  })
  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  }, [])
  const [queueFilterMode, setQueueFilterMode] = useState<QueueFilterMode>("single")
  const [singleDate, setSingleDate] = useState(todayStr)
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [queueSummary, setQueueSummary] = useState<PayAtCafeQueueSummary | null>(payAtCafeSummary || null)
  const [selectedQueueStatus, setSelectedQueueStatus] = useState<QueueStatusKey>("pending")
  const [queueItems, setQueueItems] = useState<PayAtCafeQueueItem[]>([])
  const [isQueueSummaryLoading, setIsQueueSummaryLoading] = useState(false)
  const [isQueueListLoading, setIsQueueListLoading] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [isQueueOverlayOpen, setIsQueueOverlayOpen] = useState(false)
  const [queueActionProcessing, setQueueActionProcessing] = useState<{
    bookingId: number | null
    action: "accept" | "reject" | null
  }>({ bookingId: null, action: null })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (payAtCafeSummary) setQueueSummary(payAtCafeSummary)
  }, [payAtCafeSummary])

  const buildQueueFilterQuery = () => {
    const params = new URLSearchParams()
    if (queueFilterMode === "single") {
      if (!singleDate) return null
      params.set("date", singleDate)
    } else {
      if (!startDate || !endDate) return null
      params.set("start_date", startDate)
      params.set("end_date", endDate)
    }
    return params
  }

  const fetchQueueSummary = async () => {
    if (!vendorId) return
    const params = buildQueueFilterQuery()
    if (!params) {
      setQueueError("Please select date filter")
      return
    }

    try {
      setIsQueueSummaryLoading(true)
      setQueueError(null)
      const res = await fetch(`${BOOKING_URL}/api/pay-at-cafe/queue-summary/${vendorId}?${params.toString()}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success || !json?.summary) {
        throw new Error(json?.message || "Failed to load queue summary")
      }
      setQueueSummary({
        requested: Number(json.summary.requested || 0),
        pending: Number(json.summary.pending || 0),
        accepted: Number(json.summary.accepted || 0),
        rejected: Number(json.summary.rejected || 0),
        auto_accepted: Number(json.summary.auto_accepted || 0),
        auto_rejected: Number(json.summary.auto_rejected || 0),
      })
    } catch (err: any) {
      setQueueError(err?.message || "Failed to load queue summary")
    } finally {
      setIsQueueSummaryLoading(false)
    }
  }

  const fetchQueueList = async (status: QueueStatusKey) => {
    if (!vendorId) return
    const params = buildQueueFilterQuery()
    if (!params) {
      setQueueError("Please select date filter")
      return
    }

    try {
      setIsQueueListLoading(true)
      setQueueError(null)
      params.set("status", status)
      const res = await fetch(`${BOOKING_URL}/api/pay-at-cafe/queue-list/${vendorId}?${params.toString()}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load queue list")
      }
      setQueueItems(Array.isArray(json.items) ? json.items : [])
    } catch (err: any) {
      setQueueError(err?.message || "Failed to load queue list")
    } finally {
      setIsQueueListLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !vendorId) return
    void fetchQueueSummary()
    void fetchQueueList(selectedQueueStatus)
  }, [isOpen, vendorId])

  useEffect(() => {
    if (!isOpen) setIsQueueOverlayOpen(false)
  }, [isOpen])


  const handleAccept = async (notification: PayAtCafeNotification) => {
    if (processingAction.bookingId) return

    try {
      setProcessingAction({ bookingId: notification.bookingId, action: 'accept' })

      console.log(`🔄 Processing accept for booking ${notification.bookingId}`)

      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: notification.bookingId,
          vendor_id: vendorId,
          action_source: "manual_dashboard",
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onRemoveNotification(notification.bookingId)

        if (socket) {
          console.log('📡 Emitting booking_accepted event for real-time update')
          socket.emit('booking_accepted', {
            bookingId:      notification.bookingId,
            vendorId:       vendorId,
            userId:         notification.userId,
            username:       notification.username,
            game_id:        notification.game_id,
            consoleType:    notification.consoleType,
            date:           notification.date,
            time:           notification.time,
            status:         'Confirmed',
            booking_status: 'upcoming'
          })
        }

        if (onBookingAccepted) {
          const bookingData = {
            bookingId:   notification.bookingId,
            slotId:      notification.slotId,
            username:    notification.username,
            userId:      notification.userId,
            game:        notification.game.game_name,
            game_id:     notification.game_id,
            consoleType: notification.consoleType,
            date:        notification.date,
            time:        notification.time,
            status:      'Confirmed',
            statusLabel: 'Confirmed'
          }
          console.log('📅 Triggering upcoming bookings update with:', bookingData)
          onBookingAccepted(bookingData)
        }

        if (result?.booking_ids?.length > 1 && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refresh-dashboard"))
        }

        // ✅ UPDATED: Toast correctly says payment is NOT done yet
        const collectAmount = notification.total_amount || notification.game.single_slot_price
        showToast('✅ Booking accepted! Collect ₹' + collectAmount + ' after session completion.', 'success')
        console.log(`✅ Booking ${notification.bookingId} confirmed — payment to be collected after session`)
      } else {
        throw new Error(result.message || 'Failed to accept booking')
      }
    } catch (error) {
      console.error('Error accepting booking:', error)
      showToast('❌ Error accepting booking. Please try again.', 'error')
    } finally {
      setProcessingAction({ bookingId: null, action: null })
    }
  }


  const handleReject = async (notification: PayAtCafeNotification) => {
    if (processingAction.bookingId) return

    try {
      setProcessingAction({ bookingId: notification.bookingId, action: 'reject' })

      console.log(`🔄 Processing reject for booking ${notification.bookingId}`)

      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id:       notification.bookingId,
          vendor_id:        vendorId,
          action_source:    "manual_dashboard",
          rejection_reason: 'Rejected by vendor'
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onRemoveNotification(notification.bookingId)
        if (result?.booking_ids?.length > 1 && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("refresh-dashboard"))
        }
        showToast('✅ Booking rejected and cancelled successfully!', 'success')
        console.log(`❌ Booking ${notification.bookingId} cancelled successfully`)
      } else {
        throw new Error(result.message || 'Failed to reject booking')
      }
    } catch (error) {
      console.error('Error rejecting booking:', error)
      showToast('❌ Error rejecting booking. Please try again.', 'error')
    } finally {
      setProcessingAction({ bookingId: null, action: null })
    }
  }


  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }


  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-xl z-[10000] text-white font-medium transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        <span>${message}</span>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 4000)
  }


  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const parseTimeToMinutes = (time12h: string) => {
    const match = String(time12h || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return null
    const hour12 = Number(match[1])
    const minute = Number(match[2])
    const suffix = match[3].toUpperCase()
    if (!Number.isFinite(hour12) || !Number.isFinite(minute)) return null
    let hour24 = hour12 % 12
    if (suffix === "PM") hour24 += 12
    return (hour24 * 60) + minute
  }

  const getIstNow = () => {
    const now = new Date()
    const istDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    const istTime = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const [h, m] = istTime.split(":").map((v) => Number(v))
    return {
      date: istDate,
      minutes: (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0),
    }
  }

  const isQueueItemPastInIST = (item: PayAtCafeQueueItem) => {
    const nowIst = getIstNow()
    const itemDate = String(item.date || "")
    if (!itemDate) return false
    if (itemDate < nowIst.date) return true
    if (itemDate > nowIst.date) return false
    const endSegment = String(item.time || "").split("-")[1]?.trim()
    const endMinutes = endSegment ? parseTimeToMinutes(endSegment) : null
    if (endMinutes === null) return false
    return endMinutes <= nowIst.minutes
  }

  const handleQueueBookingAction = async (item: PayAtCafeQueueItem, action: "accept" | "reject") => {
    if (!vendorId || queueActionProcessing.bookingId) return
    try {
      setQueueActionProcessing({ bookingId: item.booking_id, action })
      const endpoint = action === "accept" ? "accept" : "reject"
      const payload: any = {
        booking_id: item.booking_id,
        vendor_id: vendorId,
        action_source: "manual_dashboard",
      }
      if (action === "reject") payload.rejection_reason = "Rejected by vendor"
      const response = await fetch(`${BOOKING_URL}/api/pay-at-cafe/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Failed to ${action} booking`)
      }
      showToast(`✅ Booking ${action === "accept" ? "accepted" : "rejected"} successfully`, "success")
      onRemoveNotification(item.booking_id)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-dashboard"))
      }
      await fetchQueueSummary()
      await fetchQueueList(selectedQueueStatus)
    } catch (error) {
      console.error(`Error performing ${action} from queue overlay:`, error)
      showToast(`❌ Unable to ${action} booking`, "error")
    } finally {
      setQueueActionProcessing({ bookingId: null, action: null })
    }
  }


  const notificationCount = notifications.length
  const queueStatusCards: Array<{
    key: QueueStatusKey
    label: string
    value: number
    valueClass: string
  }> = [
    { key: "requested", label: "Requested", value: Number(queueSummary?.requested || 0), valueClass: "text-foreground" },
    { key: "accepted", label: "Accepted", value: Number(queueSummary?.accepted || 0), valueClass: "text-emerald-300" },
    { key: "rejected", label: "Rejected", value: Number(queueSummary?.rejected || 0), valueClass: "text-rose-300" },
    { key: "pending", label: "Pending", value: Number(queueSummary?.pending || 0), valueClass: "text-amber-300" },
    { key: "auto_accepted", label: "Auto Accepted", value: Number(queueSummary?.auto_accepted || 0), valueClass: "text-emerald-300" },
    { key: "auto_rejected", label: "Auto Rejected", value: Number(queueSummary?.auto_rejected || 0), valueClass: "text-rose-300" },
  ]


  const panelContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[30000] bg-black/30 backdrop-blur-sm"
          />

          {/* Notification Panel */}
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="dashboard-module-panel fixed left-4 right-4 top-16 z-[30010] max-h-[85vh] overflow-hidden rounded-2xl shadow-[0_18px_60px_rgba(2,6,23,0.35)] md:left-auto md:w-[26rem]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <h3 className="dash-title !text-base">Notifications</h3>
                {notificationCount > 0 && (
                  <Badge className="border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 rounded-full p-0 text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto bg-transparent p-2 sm:p-3">
              <div className="dashboard-module-card mb-3 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                    Pay At Cafe Queue
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      setIsQueueOverlayOpen(true)
                      await fetchQueueSummary()
                      await fetchQueueList(selectedQueueStatus)
                    }}
                    className="h-7 dashboard-btn-primary px-2 text-[11px]"
                  >
                    Open Queue
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {queueStatusCards.map((card) => {
                    return (
                      <button
                        type="button"
                        key={card.key}
                        className="rounded-md border border-border bg-muted/40 px-2 py-1 text-left transition hover:border-cyan-400/30"
                        onClick={async () => {
                          setSelectedQueueStatus(card.key)
                          setIsQueueOverlayOpen(true)
                          await fetchQueueList(card.key)
                        }}
                      >
                        <span className="text-muted-foreground">{card.label}</span>
                        <div className={`font-semibold ${card.valueClass}`}>
                          {card.value}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {queueError && (
                  <p className="mt-1 text-[11px] text-rose-300">{queueError}</p>
                )}
                {(isQueueSummaryLoading || isQueueListLoading) && (
                  <p className="mt-1 text-[11px] text-cyan-200">Loading...</p>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="dashboard-module-card px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/40">
                    <Bell className="h-8 w-8 text-muted-foreground opacity-70" />
                  </div>
                  <h4 className="mb-2 font-medium text-foreground">No notifications</h4>
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Meal additions and pay-at-cafe requests will appear here for quick action.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification, index) => {
                    const isMealNotice = (notification as any)?.kind === "meals_added"
                    const isThisBookingProcessing = !isMealNotice && processingAction.bookingId === (notification as any).bookingId
                    const isAcceptProcessing = isThisBookingProcessing && processingAction.action === 'accept'
                    const isRejectProcessing = isThisBookingProcessing && processingAction.action === 'reject'

                    if (isMealNotice) {
                      const mealNotice = notification as MealsAddedNotification
                      return (
                        <motion.div
                          key={mealNotice.notification_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="dashboard-module-card rounded-xl p-4 transition-all duration-200"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">Meals Added</p>
                                {mealNotice.emitted_at && (
                                  <p className="text-xs text-slate-400">
                                    {formatRelativeTime(mealNotice.emitted_at)}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 border-cyan-400/50 bg-cyan-500/10 text-xs text-cyan-200"
                              >
                                <Wallet className="w-3 h-3" />
                                Pending
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-200">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-100">{mealNotice.username || "Customer"}</span>
                              <span className="text-xs text-slate-400">added meals</span>
                            </div>
                            <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-3 text-center">
                              <span className="text-xs text-cyan-200">Amount to collect</span>
                              <div className="text-2xl font-bold text-cyan-200">
                                ₹{Number(mealNotice.amount_added || 0).toFixed(0)}
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                className="h-8 border-cyan-400/40 bg-cyan-500/10 text-xs text-cyan-200 hover:bg-cyan-500/20"
                                onClick={() => onRemoveNotification(mealNotice.notification_id)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    }

                    const isDocumentNotice = (notification as any)?.kind === "document_status"
                    if (isDocumentNotice) {
                      const docNotice = notification as DocumentStatusNotification
                      const isVerified = docNotice.statusType === "verified"
                      return (
                        <motion.div
                          key={docNotice.notification_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`dashboard-module-card rounded-xl p-4 transition-all duration-200 ${
                            isVerified
                              ? "border border-emerald-400/35 bg-emerald-500/10"
                              : "border border-rose-400/35 bg-rose-500/10"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <FileWarning className={`h-4 w-4 ${isVerified ? "text-emerald-300" : "text-rose-300"}`} />
                              <p className={`text-sm font-semibold ${isVerified ? "text-emerald-100" : "text-rose-100"}`}>{docNotice.title}</p>
                            </div>
                            <p className={`text-xs ${isVerified ? "text-emerald-100/90" : "text-rose-100/90"}`}>{docNotice.message}</p>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                className={`h-8 text-xs ${
                                  isVerified
                                    ? "border-emerald-400/45 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                                    : "border-rose-400/45 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                                }`}
                                onClick={() => {
                                  onClose()
                                  if (typeof window !== "undefined") {
                                    window.location.href = "/account"
                                  }
                                }}
                              >
                                Open Settings
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    }

                    const payNotice = notification as PayAtCafeNotification
                    return (
                      <motion.div
                        key={payNotice.notification_id || payNotice.event_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`dashboard-module-card rounded-xl p-4 transition-all duration-200 ${
                          isThisBookingProcessing ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="space-y-3">

                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">Pay at Cafe Request</p>
                              <p className="text-xs text-slate-400">
                                {formatRelativeTime(payNotice.emitted_at)}
                              </p>
                            </div>
                            {/* ✅ CHANGED: "To Be Paid" badge instead of plain dot */}
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 border-orange-400/50 bg-orange-500/10 text-xs text-orange-300"
                            >
                              <Wallet className="w-3 h-3" />
                              To Be Paid
                            </Badge>
                          </div>

                          {/* Customer Name */}
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-100">{payNotice.username}</span>
                            <span className="text-xs text-slate-400">wants to book</span>
                            {payNotice.slot_count && payNotice.slot_count > 1 && (
                              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                {payNotice.slot_count} slots
                              </span>
                            )}
                          </div>

                          {/* Game + Console */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                              {payNotice.game?.game_name || "Gaming Session"}
                            </span>
                            <span className="flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-800/80 px-2 py-0.5 text-slate-300">
                              <Gamepad2 className="h-3 w-3 text-rose-400" />
                              {payNotice.consoleType || "Console"}
                            </span>
                          </div>

                          {/* Time and Date */}
                          <div className="flex items-center gap-4 text-sm text-slate-200">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{payNotice.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDisplayDate(payNotice.date)}</span>
                            </div>
                          </div>

                          {/* ✅ CHANGED: Orange box clearly showing "To Be Paid", not green "Paid" */}
                          <div className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-3">
                            <p className="mb-1 text-center text-xs font-medium text-orange-300">
                              To Be Paid at Cafe
                            </p>
                            <div className="text-center">
                              <span className="text-2xl font-bold text-orange-300">
                                ₹{payNotice.total_amount ?? payNotice.game.single_slot_price}
                              </span>
                            </div>
                            {/* ✅ NEW: Subtle reminder so vendor knows what to do */}
                            <p className="mt-1 text-center text-xs text-slate-400">
                              Collect after session completion
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAccept(payNotice)}
                              disabled={isThisBookingProcessing}
                              className="h-9 flex-1 dashboard-btn-primary text-sm"
                            >
                              {isAcceptProcessing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              {isAcceptProcessing ? 'Accepting...' : 'Accept'}
                            </Button>
                            <Button
                              onClick={() => handleReject(payNotice)}
                              disabled={isThisBookingProcessing}
                              variant="outline"
                              className="h-9 flex-1 border-rose-400/45 bg-rose-500/10 text-sm text-rose-200 hover:bg-rose-500/20"
                            >
                              {isRejectProcessing ? (
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-transparent" />
                              ) : (
                                <X className="mr-2 h-4 w-4" />
                              )}
                              {isRejectProcessing ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </div>

                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {isQueueOverlayOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsQueueOverlayOpen(false)}
                  className="fixed inset-0 z-[30020] bg-black/45 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  className="dashboard-module-panel fixed left-1/2 top-1/2 z-[30030] w-[min(42rem,calc(100vw-2rem))] max-h-[78vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-cyan-400/30 bg-background"
                >
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <h4 className="dash-title !text-sm">Pay At Cafe Queue</h4>
                      <Badge className="border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 text-[10px]">
                        {queueFilterMode === "single" ? singleDate : `${startDate} to ${endDate}`}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsQueueOverlayOpen(false)}
                      className="h-7 w-7 rounded-full p-0 text-slate-300 hover:bg-cyan-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-[66vh] space-y-3 overflow-y-auto p-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={queueFilterMode === "single" ? "default" : "outline"}
                          onClick={() => setQueueFilterMode("single")}
                          className={`h-7 px-2 text-[11px] ${queueFilterMode === "single" ? "dashboard-btn-primary" : "border-border bg-muted/40 text-muted-foreground"}`}
                        >
                          Single Date
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={queueFilterMode === "range" ? "default" : "outline"}
                          onClick={() => setQueueFilterMode("range")}
                          className={`h-7 px-2 text-[11px] ${queueFilterMode === "range" ? "dashboard-btn-primary" : "border-border bg-muted/40 text-muted-foreground"}`}
                        >
                          Date Range
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        {queueFilterMode === "single" ? (
                          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                            Date
                            <input
                              type="date"
                              value={singleDate}
                              onChange={(e) => setSingleDate(e.target.value)}
                              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                            />
                          </label>
                        ) : (
                          <>
                            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                              Start
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                              End
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                              />
                            </label>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            await fetchQueueSummary()
                            await fetchQueueList(selectedQueueStatus)
                          }}
                          className="h-8 dashboard-btn-primary text-xs"
                          disabled={isQueueSummaryLoading || isQueueListLoading}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                      {queueStatusCards.map((card) => {
                        const isActive = selectedQueueStatus === card.key
                        return (
                          <button
                            type="button"
                            key={card.key}
                            className={`rounded-md border px-2 py-1 text-left transition ${
                              isActive
                                ? "border-cyan-400/45 bg-cyan-500/15"
                                : "border-border bg-muted/40 hover:border-cyan-400/30"
                            }`}
                            onClick={async () => {
                              setSelectedQueueStatus(card.key)
                              await fetchQueueList(card.key)
                            }}
                          >
                            <span className="text-muted-foreground">{card.label}</span>
                            <div className={`font-semibold underline decoration-dotted underline-offset-2 ${card.valueClass}`}>
                              {card.value}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {queueError && <p className="text-xs text-rose-300">{queueError}</p>}

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                          {queueStatusCards.find((c) => c.key === selectedQueueStatus)?.label} List
                        </p>
                        <Badge className="border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 text-[10px]">
                          {queueItems.length}
                        </Badge>
                      </div>
                      {queueItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No records found for selected filter.</p>
                      ) : (
                        <div className="space-y-2">
                          {queueItems.map((item) => {
                            const isPastPending = selectedQueueStatus === "pending" && isQueueItemPastInIST(item)
                            const isItemProcessing = queueActionProcessing.bookingId === item.booking_id
                            return (
                              <div key={`${selectedQueueStatus}-${item.booking_id}`} className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-foreground">{item.username}</p>
                                  <span className="font-semibold text-amber-300">₹{Number(item.amount || 0).toFixed(0)}</span>
                                </div>
                                <p className="text-muted-foreground">{item.game_name}</p>
                                <p className="text-muted-foreground">{formatDisplayDate(item.date)} • {item.time}</p>
                                <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
                                  <span>Phone: {item.phone || "-"}</span>
                                  <span className="min-w-0 break-all">Email: {item.email || "-"}</span>
                                </div>
                                {selectedQueueStatus === "pending" && (
                                  <div className="mt-2 flex gap-2">
                                    {!isPastPending && (
                                      <Button
                                        type="button"
                                        onClick={() => handleQueueBookingAction(item, "accept")}
                                        disabled={isItemProcessing}
                                        className="h-7 dashboard-btn-primary px-2 text-[11px]"
                                      >
                                        {isItemProcessing && queueActionProcessing.action === "accept" ? "Accepting..." : "Accept"}
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      onClick={() => handleQueueBookingAction(item, "reject")}
                                      disabled={isItemProcessing}
                                      variant="outline"
                                      className="h-7 border-rose-400/45 bg-rose-500/10 px-2 text-[11px] text-rose-200 hover:bg-rose-500/20"
                                    >
                                      {isItemProcessing && queueActionProcessing.action === "reject" ? "Rejecting..." : "Reject"}
                                    </Button>
                                    {isPastPending && (
                                      <span className="self-center text-[10px] text-amber-300">
                                        Past session (IST): reject only
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(panelContent, document.body)
}
