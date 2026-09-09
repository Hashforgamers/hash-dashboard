"use client"

import { Suspense } from "react";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import ManagePassesPage from "../../components/manage-pass";
import { PageHeader } from "../../components/page-header"

export default function TransactionReportPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Gaming Passes" />

        <Suspense fallback={<div className="feature-page-content feature-page-content-scroll gaming-panel" />}>
          <div className="feature-page-content feature-page-content-scroll gaming-panel">
            <ManagePassesPage />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
