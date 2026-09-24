import React from 'react'
import { Navigation } from '@/components/Navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans-custom transition-colors duration-200">
      <Navigation />
      <main className="flex-1 px-4 md:px-6 pt-6 pb-28 md:pb-32">
        {children}
      </main>
    </div>
  )
}
