import GamersCreditControl from "../../components/gamers-credit-control";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { PageHeader } from "../../components/page-header"

export default function GamersCreditPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="feature-page-shell">
        <PageHeader title="Gamers Credit" />
        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <GamersCreditControl />
        </div>
      </div>
    </DashboardLayout>
  );
}
