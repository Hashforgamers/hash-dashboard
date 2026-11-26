import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { PageHeader } from "../../components/page-header";
import { CafeBookingLink } from "../../components/cafe-booking-link";

export default function BookingLinkPage() {
  return (
    <DashboardLayout contentScroll="page">
      <div className="feature-page-shell">
        <PageHeader title="Booking Link & QR" />
        <div className="feature-page-content feature-page-content-scroll gaming-panel">
          <CafeBookingLink />
        </div>
      </div>
    </DashboardLayout>
  );
}
