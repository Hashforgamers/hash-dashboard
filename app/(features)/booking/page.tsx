import { DashboardLayout } from "../../(layout)/dashboard-layout"
import SlotManagement from "@/app/components/newSlot"
import { PageHeader } from "../../components/page-header"



export default function ManageBookingPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Bookings" />

        <div className="feature-page-content feature-page-content-scroll booking-command-panel">
          <SlotManagement embedded />
        </div>
      </div>
    </DashboardLayout>
  )
}
