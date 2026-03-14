import { Sparkles } from "lucide-react"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import ManageExtraServices from "../../components/manageextra-service"

export default function ManageExtraServicePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Extra Service Control
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Manage cafe add-ons, meals, and beverage inventory with cleaner control.
          </p>
        </div>

        <div className="feature-page-content gaming-panel">
          <ManageExtraServices />
        </div>
      </div>
    </DashboardLayout>
  )
}
