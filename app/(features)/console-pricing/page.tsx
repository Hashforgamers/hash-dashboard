import ConsolePricing from "../../components/console-pricing";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { PageHeader } from "../../components/page-header"

export default function ManageConsolePricing() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Console Pricing" />

        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <ConsolePricing />
        </div>
      </div>
    </DashboardLayout>
  );
}
