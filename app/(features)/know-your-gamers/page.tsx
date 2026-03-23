import { KnowYourGamers } from "../../components/know-your-gamers";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Sparkles } from "lucide-react";

export default function ManageKnowYourGamers() {
  return (
    <DashboardLayout>
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Gamer Intelligence Hub
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Track player behavior, value, and retention insights in one command view.
          </p>
        </div>

        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <KnowYourGamers />
        </div>
      </div>
    </DashboardLayout>
  );
}
