
import ConsolePricing from "../../components/console-pricing";
import { DashboardLayout } from "../../(layout)/dashboard-layout";

export default function ManageConsolePricing() {
  return (
    <DashboardLayout>
      <div className="flex-1 p-4 md:py-4">
        {/* <h1 className="text-3xl font-bold">Manage Gaming Console</h1> */}

        < ConsolePricing />
      </div>
    </DashboardLayout>
  );
}
