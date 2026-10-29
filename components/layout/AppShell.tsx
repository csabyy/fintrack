'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import SyncFailureBanner from './SyncFailureBanner'
import { Menu } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-paper">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-paper-2 border-b border-rule px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-[3px] hover:bg-paper text-slate-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded-[3px] flex items-center justify-center">
              <span className="font-serif text-on-accent text-sm">F</span>
            </div>
            <span className="font-serif text-xl text-slate-900">FinTrack</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <SyncFailureBanner />
          {children}
        </div>
      </main>
    </div>
  )
}
