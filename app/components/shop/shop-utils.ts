export const rupees = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

export const percentOff = (price: number, mrp: number) => (mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0)

const SWATCH: Record<string, string> = {
  black: "#111", white: "#f5f5f5", grey: "#8a8a8f", gray: "#8a8a8f", silver: "#c9cbd0", graphite: "#3b3b40", red: "#e53935", crimson: "#c0182f",
  blue: "#5b8def", navy: "#1b2a4a", cyan: "#2ec5d3", teal: "#1f9e95", green: "#2e9d55", mint: "#9be3c5", yellow: "#f6c945", orange: "#ff8a1f",
  pink: "#ff8fc1", purple: "#7b4ae2", lavender: "#b9a6f0", gold: "#d4af37", brown: "#7a4e2d", beige: "#e3d5b8", cream: "#f2e8d2",
}

/** A display colour for a colour option value such as "Matte Black", or null. */
export const swatchFor = (value: string) => {
  const key = String(value).toLowerCase().split(/[\s/-]+/).find((w) => SWATCH[w])
  return key ? SWATCH[key] : null
}

export const isColourOption = (o: { key?: string; title?: string }) => /colou?r/i.test(o.key || "") || /colou?r/i.test(o.title || "")

// Labels from hash-medusa docs/HFG-ORDER-TRACKING.md, as the website shows them.
const STAGE_LABELS: Record<string, string> = {
  placed: "New order",
  payment_confirmed: "Payment confirmed",
  accepted: "Accepted",
  preparing: "Processing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivery_attempted: "Delivery attempted",
  delivered: "Delivered",
  ready_for_service: "Ready for service",
  in_progress: "Service in progress",
  completed: "Completed",
  canceled: "Canceled",
  cancellation_pending: "Cancellation pending",
  carrier_delivered: "Courier says delivered, share your code",
  return_in_progress: "Return in progress",
  carrier_update: "Courier update",
}

export const stageLabel = (s: string | null | undefined) => (s ? STAGE_LABELS[s] || s.replace(/_/g, " ") : "")

export const stageVariant = (s: string | null | undefined): "success" | "warning" | "danger" | "info" | "neutral" => {
  if (!s) return "neutral"
  if (s === "delivered" || s === "completed") return "success"
  if (s === "canceled") return "danger"
  if (s === "cancellation_pending" || s === "delivery_attempted" || s === "placed") return "warning"
  return "info"
}

/** Medusa order status for the list (the Hash stage shows on the order itself). */
export const orderStatusLabel = (s: string) => ({ pending: "Open", completed: "Completed", canceled: "Canceled", archived: "Archived", requires_action: "Needs action" } as Record<string, string>)[s] || s || "Open"
export const orderStatusVariant = (s: string) => (s === "completed" ? "success" : s === "canceled" ? "danger" : s === "requires_action" ? "warning" : "info") as "success" | "danger" | "warning" | "info"
