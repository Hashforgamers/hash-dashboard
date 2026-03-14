import { MyAccount } from "../../components/my-account";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Sparkles } from "lucide-react";

export default function MyAccountPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Account Command Center
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Manage profile, business settings, payout configuration, and account preferences.
          </p>
        </div>

        <div className="feature-page-content gaming-panel">
          <MyAccount />
        </div>
      </div>
    </DashboardLayout>
  );
}
