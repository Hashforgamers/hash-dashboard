import { ThemeProvider } from "next-themes";

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Add BackButton here */}

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
