"use client";

import { TransactionTable } from "../components/transaction-table";
import { DashboardLayout } from "../components/dashboard-layout";

export default function TransactionReportPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">Transaction Report</h1> */}
        <TransactionTable />
      </div>
    </DashboardLayout>
  );
}
