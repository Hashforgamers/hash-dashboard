import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";
import { Manrope, Space_Grotesk } from "next/font/google";

import "./globals.css";
import "./premium.css";
import { SocketProvider } from "./context/SocketContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
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
      <body className={`${manrope.variable} ${spaceGrotesk.variable} bg-background text-foreground`}>
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
