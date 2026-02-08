import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";

import "./globals.css";
import { SocketProvider } from "./context/SocketContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";

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
      <body className="bg-background text-foreground">
        <AuthProvider>
          {" "}
          {/* Wrap inside AuthProvider */}
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          <SocketProvider>
            <SubscriptionProvider>
            {children}
            </SubscriptionProvider>
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}