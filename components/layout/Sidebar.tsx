'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn, getInitials } from '@/lib/utils'
import ThemeToggle from '@/components/ui/ThemeToggle'
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Settings,
  LogOut,
  TrendingUp,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const content = (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-md flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-on-accent" />
          </div>
          <div>
            <p className="font-serif text-slate-900 text-2xl leading-none">FinTrack</p>
            <p className="text-slate-500 text-xs mt-1">Finance Manager</p>
          </div>
        </div>
        {/* Close button on mobile */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="text-slate-500 hover:text-slate-900 p-1 -mr-1 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="eyebrow px-3 mb-3">Menu</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn('sidebar-item', active && 'active')}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 bg-brand-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Settings + User section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/settings"
          onClick={onMobileClose}
          className={cn('sidebar-item', pathname.startsWith('/settings') && 'active')}
        >
          <Settings size={16} />
          <span>Settings</span>
          {pathname.startsWith('/settings') && (
            <div className="ml-auto w-1.5 h-1.5 bg-brand-500 rounded-full" />
          )}
        </Link>

        <ThemeToggle className="mx-1 my-2" />

        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="w-8 h-8 bg-brand-50 border border-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-brand-500 text-xs font-bold">
              {session?.user?.name ? getInitials(session.user.name) : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-sm font-semibold truncate">{session?.user?.name || 'User'}</p>
            <p className="text-slate-500 text-xs truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="sidebar-item w-full text-left text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <div className="hidden lg:block fixed left-0 top-0 z-30 h-screen">
        {content}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-scrim/50 z-40 lg:hidden"
            onClick={onMobileClose}
          />
          <div className="fixed left-0 top-0 z-50 h-screen lg:hidden">
            {content}
          </div>
        </>
      )}
    </>
  )
}
