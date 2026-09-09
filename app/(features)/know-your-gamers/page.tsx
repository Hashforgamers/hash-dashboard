import { Suspense } from "react";
import { KnowYourGamers } from "../../components/know-your-gamers";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { PageHeader } from "../../components/page-header"

export default function ManageKnowYourGamers() {
  return (
    <DashboardLayout>
      <div className="feature-page-shell">
        <PageHeader title="Gamers" />

        <Suspense fallback={<div className="feature-page-content feature-page-content-scroll gaming-panel" />}>
          <div className="feature-page-content feature-page-content-scroll gaming-panel">
            <KnowYourGamers />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
