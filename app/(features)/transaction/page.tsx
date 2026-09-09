"use client"

import { Suspense } from "react";
import { TransactionTable } from "../../components/transaction-table";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { PageHeader } from "../../components/page-header"

export default function TransactionReportPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Transactions" />

        <Suspense fallback={<div className="feature-page-content feature-page-content-scroll gaming-panel flex min-h-0" />}>
          <div className="feature-page-content feature-page-content-scroll gaming-panel flex min-h-0">
            <TransactionTable />
          </div>
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
