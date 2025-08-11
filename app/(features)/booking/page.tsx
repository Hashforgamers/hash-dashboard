import { ManageBooking } from "../../components/manage-booking"
import { DashboardLayout } from "../../(layout)/dashboard-layout"

export default function ManageBookingPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">Manage Booking</h1> */}
        <ManageBooking />
      </div>
    </DashboardLayout>
  )
}

