import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'State Application Inventory',
  description: "Manage your agency's application inventory and complete annual certification.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
