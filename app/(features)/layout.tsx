// export const metadata = {
//   title: 'Hash for Gamers',
//   description: 'Gaming Cafe Booking App',
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en">
//       <body>{children}</body>
//     </html>
//   )
// }
 

// features/layout.tsx

export const metadata = {
  title: 'Hash for Gamers',
  description: 'Gaming Cafe Booking App',
}

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // REMOVE <html> and <body> here. Just return the children.
  return (
    <div className="min-h-screen"> 
      {children}
    </div>
  )
}