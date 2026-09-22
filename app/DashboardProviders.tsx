"use client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";
import { SocketProvider } from "./context/SocketContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { AccessProvider } from "./context/AccessContext";
import { DashboardDataProvider } from "./context/DashboardDataContext";
import { DashboardDataBus } from "./context/DashboardDataBus";
import { TableDragScroll } from "./components/TableDragScroll";
import { MobileInstallBanner } from "./components/MobileInstallBanner";
export default function DashboardProviders({children}:{children:React.ReactNode}) {
  return <AuthProvider><ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
    <SocketProvider><SubscriptionProvider><AccessProvider><DashboardDataProvider>
      <DashboardDataBus/><TableDragScroll/><MobileInstallBanner/>{children}
    </DashboardDataProvider></AccessProvider></SubscriptionProvider></SocketProvider>
  </ThemeProvider></AuthProvider>;
}
