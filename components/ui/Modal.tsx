'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/50" onClick={onClose} />
      <div
        className={cn(
          'relative flex flex-col max-h-[calc(100dvh-2rem)] bg-card border border-rule-strong rounded-md shadow-[0_30px_60px_-30px_rgba(21,27,36,.5)] w-full animate-slide-up',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-2xl',
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-rule">
          <h2 className="font-serif text-xl font-medium text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-paper-2 rounded-[3px] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
