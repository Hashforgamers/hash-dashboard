import { MyAccount } from "../../components/my-account";
import { DashboardLayout } from "../../(layout)/dashboard-layout";

export default function MyAccountPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">My Account</h1> */}
        <MyAccount />
      </div>
    </DashboardLayout>
  );
}
