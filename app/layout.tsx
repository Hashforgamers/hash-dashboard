import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./AuthProvider";

import "./globals.css";
import { SocketProvider } from "./context/SocketContext";

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
      <body>
        <AuthProvider>
          {" "}
          {/* Wrap inside AuthProvider */}
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          <SocketProvider>
            {children}
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}