import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";
import { Silkscreen } from "next/font/google";

import "./globals.css";
import "./premium.css";
import { SocketProvider } from "./context/SocketContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import { AccessProvider } from "./context/AccessContext";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel",
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
      <body className={`${silkscreen.variable} bg-background text-foreground`}>
        <AuthProvider>
          {" "}
          {/* Wrap inside AuthProvider */}
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          <SocketProvider>
            <SubscriptionProvider>
            <AccessProvider>{children}</AccessProvider>
            </SubscriptionProvider>
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
