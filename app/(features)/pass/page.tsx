"use client"

import { DashboardLayout } from "../../(layout)/dashboard-layout";
import ManagePassesPage from "../../components/manage-pass";

export default function TransactionReportPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">Transaction Report</h1> */}
        <ManagePassesPage />
      </div>
    </DashboardLayout>
  );
}
