
import ConsolePricing from "../../components/console-pricing";
import { DashboardLayout } from "../../(layout)/dashboard-layout";

export default function ManageConsolePricing() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">Manage Gaming Console</h1> */}

        < ConsolePricing />
      </div>
    </DashboardLayout>
  );
}
