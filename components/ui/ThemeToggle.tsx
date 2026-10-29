'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  // The stored theme is only known on the client; render a neutral state until mounted to avoid a hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn('flex gap-1 bg-paper-2 border border-rule p-1 rounded-md', className)}>
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[3px] text-xs font-medium transition-colors',
              active
                ? 'bg-card text-ink font-semibold shadow-[inset_0_-2px_0_var(--accent)]'
                : 'text-ink-2 hover:text-ink'
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
