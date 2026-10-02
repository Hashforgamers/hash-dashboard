import { Suspense } from "react";
import { ManageGamingConsole } from "../../components/manage-gaming-console";
import { DashboardLayout } from "../../(layout)/dashboard-layout";

export default function ManageGamingConsolePage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="dashboard-module dashboard-page-shell h-full">
        {/* <h1 className="text-3xl font-bold">Manage Gaming Console</h1> */}

        <Suspense fallback={<p role="status" className="p-4 text-sm">Loading consoles…</p>}><ManageGamingConsole /></Suspense>
      </div>
    </DashboardLayout>
  );
}
