import { Suspense } from "react"
import ShopPage from "@/app/components/shop/shop-page"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { PageHeader } from "../../components/page-header"

export default function StorePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Shop" />

        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <Suspense fallback={null}>
            <ShopPage />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  )
}
