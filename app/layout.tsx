import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";
import { Inter } from "next/font/google";

import "./globals.css";
import "./premium.css";
import { SocketProvider } from "./context/SocketContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { AccessProvider } from "./context/AccessContext";
import { DashboardDataProvider } from "./context/DashboardDataContext";
import { DashboardDataBus } from "./context/DashboardDataBus";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata ={
  title:"Hash for Gamers",
  description:"Gaming Cafe Booking App"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} bg-background text-foreground`}>
        <AuthProvider>
          {" "}
          {/* Wrap inside AuthProvider */}
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          <SocketProvider>
            <SubscriptionProvider>
            <AccessProvider>
              <DashboardDataProvider>
                <DashboardDataBus />
                {children}
              </DashboardDataProvider>
            </AccessProvider>
            </SubscriptionProvider>
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
