import { Suspense } from "react"
import VendorOrderPage from "@/app/components/vendorOrder"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { PageHeader } from "../../components/page-header"

export default function StorePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Shop" />

        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <Suspense fallback={null}>
            <VendorOrderPage />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  )
}
