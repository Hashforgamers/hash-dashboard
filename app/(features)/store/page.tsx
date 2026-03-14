import VendorOrderPage from "@/app/components/vendorOrder"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { Sparkles } from "lucide-react"

export default function StorePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Store Supply Command
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Stock and reorder cafe inventory with a faster vendor workflow.
          </p>
        </div>

        <div className="feature-page-content gaming-panel">
          <VendorOrderPage />
        </div>
      </div>
    </DashboardLayout>
  )
}
