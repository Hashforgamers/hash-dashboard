import { Sparkles } from "lucide-react"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import ManageExtraServices from "../../components/manageextra-service"

export default function ManageExtraServicePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        <div className="gaming-panel shrink-0 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="premium-heading">
              Extra Service Control
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="premium-subtle mt-1">
            Manage cafe add-ons, meals, and beverage inventory with cleaner control.
          </p>
        </div>

        <div className="gaming-panel min-h-0 flex-1 overflow-hidden rounded-xl p-2 sm:p-3 md:p-4">
          <ManageExtraServices />
        </div>
      </div>
    </DashboardLayout>
  )
}
