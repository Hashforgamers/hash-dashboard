import { DashboardLayout } from "../(layout)/dashboard-layout";
import ManageExtrasPageContent from "../components/manage-extras-page-content";

export default function ManageExtras() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <ManageExtrasPageContent />
      </div>
    </DashboardLayout>
  );
}
