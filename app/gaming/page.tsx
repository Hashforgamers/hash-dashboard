import { ManageGamingConsole } from "../components/manage-gaming-console";
import { DashboardLayout } from "../components/dashboard-layout";

export default function ManageGamingConsolePage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">Manage Gaming Console</h1> */}

        <ManageGamingConsole />
      </div>
    </DashboardLayout>
  );
}
