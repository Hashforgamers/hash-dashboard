import { DashboardLayout } from "../../(layout)/dashboard-layout"
import SlotManagement from "@/app/components/newSlot"

export default function ManageBookingPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell booking-page">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Booking Command Center
            </h1>
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Create, update, and control all booking operations with real-time clarity.
          </p>
        </div>

        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <SlotManagement embedded />
        </div>
      </div>
    </DashboardLayout>
  )
}
