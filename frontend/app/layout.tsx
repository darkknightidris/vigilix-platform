import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Vigilix - Vulnerability Management",
  description: "Platform manajemen temuan keamanan untuk tim IT Indonesia",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}