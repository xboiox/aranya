import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Aranya HRIS",
  description: "Human Resource Information System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
