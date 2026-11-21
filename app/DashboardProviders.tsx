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
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogHost } from "./components/confirm-dialog";
export default function DashboardProviders({children}:{children:React.ReactNode}) {
  return <AuthProvider><ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
    <SocketProvider><SubscriptionProvider><AccessProvider><DashboardDataProvider>
      <DashboardDataBus/><TableDragScroll/><MobileInstallBanner/>{children}<ConfirmDialogHost/><Toaster theme="dark" position="top-right" richColors closeButton/>
    </DashboardDataProvider></AccessProvider></SubscriptionProvider></SocketProvider>
  </ThemeProvider></AuthProvider>;
}
