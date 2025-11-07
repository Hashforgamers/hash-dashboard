export const metadata = {
  title: 'Hash for Gamers',
  description: 'Gaming Cafe Booking App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
