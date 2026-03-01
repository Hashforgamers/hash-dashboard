import { MyAccount } from "../../components/my-account";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Sparkles } from "lucide-react";

export default function MyAccountPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-3 sm:space-y-4">
        <div className="gaming-panel rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="premium-heading !text-xl sm:!text-2xl md:!text-3xl">
              Account Command Center
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="premium-subtle mt-1">
            Manage profile, business settings, payout configuration, and account preferences.
          </p>
        </div>

        <div className="gaming-panel rounded-xl p-2 sm:p-3 md:p-4">
          <MyAccount />
        </div>
      </div>
    </DashboardLayout>
  );
}
