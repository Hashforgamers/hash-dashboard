import ConsolePricing from "../../components/console-pricing";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Sparkles } from "lucide-react";

export default function ManageConsolePricing() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <div className="feature-page-header gaming-panel">
          <div className="feature-page-header-row">
            <h1 className="premium-heading">
              Console Pricing Command
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="feature-page-subtitle premium-subtle">
            Control base rates and dynamic promotions across all gaming systems.
          </p>
        </div>

        <div className="feature-page-content gaming-panel">
          <ConsolePricing />
        </div>
      </div>
    </DashboardLayout>
  );
}
