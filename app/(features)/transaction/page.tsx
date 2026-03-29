"use client"

import { TransactionTable } from "../../components/transaction-table";
import { DashboardLayout } from "../../(layout)/dashboard-layout";

export default function TransactionReportPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell transaction-page">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">Transaction Command</h1>
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Track settlements, payment modes, and user revenue performance in real time.
          </p>
        </div>

        <div className="feature-page-content feature-page-content-scroll gaming-panel flex min-h-0">
          <TransactionTable />
        </div>
      </div>
    </DashboardLayout>
  );
}
