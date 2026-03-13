"use client"

import { DashboardLayout } from "../../(layout)/dashboard-layout";
import ManagePassesPage from "../../components/manage-pass";
import { Sparkles } from "lucide-react";

export default function TransactionReportPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        <div className="gaming-panel shrink-0 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="premium-heading">
              Pass Command Center
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="premium-subtle mt-1">
            Create and manage date-based and hour-based gaming passes with speed.
          </p>
        </div>

        <div className="gaming-panel min-h-0 flex-1 overflow-hidden rounded-xl p-2 sm:p-3 md:p-4">
          <ManagePassesPage />
        </div>
      </div>
    </DashboardLayout>
  );
}
