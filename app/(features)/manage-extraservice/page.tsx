import { Suspense } from "react"
import { PageHeader } from "../../components/page-header"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import ManageExtraServices from "../../components/manageextra-service"

export default function ManageExtraServicePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Extra Services" />

        <Suspense fallback={<div className="feature-page-content feature-page-content-scroll gaming-panel" />}>
          <div className="feature-page-content feature-page-content-scroll gaming-panel">
            <ManageExtraServices />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
