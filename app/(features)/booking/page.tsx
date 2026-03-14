import { DashboardLayout } from "../../(layout)/dashboard-layout"
import SlotManagement from "@/app/components/newSlot"
import { Sparkles } from "lucide-react"



export default function ManageBookingPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Booking Command Center
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Create, update, and control all booking operations with real-time clarity.
          </p>
        </div>

        <div className="feature-page-content gaming-panel">
          <SlotManagement embedded />
        </div>
      </div>
    </DashboardLayout>
  )
}
