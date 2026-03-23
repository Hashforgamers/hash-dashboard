import GamersCreditControl from "../../components/gamers-credit-control";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Wallet } from "lucide-react";

export default function GamersCreditPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">Gamers Credit Ledger</h1>
            <Wallet className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Manage approved gamers with month-end payment accounts, KYC details, and transparent settlement proof.
          </p>
        </div>
        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <GamersCreditControl />
        </div>
      </div>
    </DashboardLayout>
  );
}
