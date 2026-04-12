import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";
import { Orbitron, Rajdhani } from "next/font/google";
import type { Metadata, Viewport } from "next";

import "./globals.css";
import "./premium.css";
import { SocketProvider } from "./context/SocketContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { AccessProvider } from "./context/AccessContext";
import { DashboardDataProvider } from "./context/DashboardDataContext";
import { DashboardDataBus } from "./context/DashboardDataBus";
import { TableDragScroll } from "./components/TableDragScroll";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const dashboardBaseUrl =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.hashforgamers.com";

export const metadata: Metadata = {
  metadataBase: new URL(dashboardBaseUrl),
  title: {
    default: "Hash For Gamers Dashboard",
    template: "%s | Hash For Gamers Dashboard",
  },
  description: "Gaming cafe operations dashboard by Hash For Gamers.",
  applicationName: "Hash For Gamers Dashboard",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "Hash For Gamers Dashboard",
    description: "Gaming cafe operations dashboard by Hash For Gamers.",
    url: dashboardBaseUrl,
    siteName: "Hash For Gamers",
    type: "website",
    images: [
      {
        url: "/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "Hash For Gamers",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Hash For Gamers Dashboard",
    description: "Gaming cafe operations dashboard by Hash For Gamers.",
    images: ["/web-app-manifest-512x512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#050505" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${rajdhani.variable} ${orbitron.variable}`}
    >
      <head />
      <body className="bg-background text-foreground">
        <AuthProvider>
          {" "}
          {/* Wrap inside AuthProvider */}
          <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
          <SocketProvider>
            <SubscriptionProvider>
            <AccessProvider>
              <DashboardDataProvider>
                <DashboardDataBus />
                <TableDragScroll />
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
