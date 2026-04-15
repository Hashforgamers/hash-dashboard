"use client"

import { Suspense } from "react";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import ManagePassesPage from "../../components/manage-pass";
import { Sparkles } from "lucide-react";

export default function TransactionReportPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Pass Command Center
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Create and manage date-based and hour-based gaming passes with speed.
          </p>
        </div>

        <Suspense fallback={<div className="feature-page-content feature-page-content-scroll gaming-panel" />}>
          <div className="feature-page-content feature-page-content-scroll gaming-panel">
            <ManagePassesPage />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
