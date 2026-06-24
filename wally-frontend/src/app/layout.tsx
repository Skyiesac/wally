import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import '../styles/watercolor.css'
import { QueryProvider } from '@/providers/QueryProvider'

export const metadata: Metadata = {
  title: 'Wally - AI App Generator',
  description: 'Transform ideas into Android apps with AI',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen">
        {/* Watercolor background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="watercolor-blob absolute top-0 left-0 w-96 h-96" />
          <div className="watercolor-blob absolute bottom-0 right-0 w-96 h-96" style={{ animationDelay: '2s' }} />
          <div className="watercolor-blob absolute top-1/2 left-1/2 w-96 h-96" style={{ animationDelay: '4s' }} />
        </div>

        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
