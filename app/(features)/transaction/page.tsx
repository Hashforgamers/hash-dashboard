"use client"

import { TransactionTable } from "../../components/transaction-table";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Sparkles } from "lucide-react";

export default function TransactionReportPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">Transaction Command</h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
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
