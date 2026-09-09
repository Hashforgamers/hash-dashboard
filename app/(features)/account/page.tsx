import { MyAccount } from "../../components/my-account";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { PageHeader } from "../../components/page-header"

export default function MyAccountPage() {
  return (
    <DashboardLayout contentScroll="page">
      <div className="feature-page-shell account-scope">
        <PageHeader title="Account Settings" />

        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <MyAccount />
        </div>
      </div>
    </DashboardLayout>
  );
}
