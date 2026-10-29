'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'w-8 h-8 rounded-lg text-[11px]',
  md: 'w-11 h-11 rounded-xl text-sm',
}

/** Bank logo from TrueLayer, falling back to the account's colored initials. */
export default function BankLogo({ logoUri, name, bankName, color, size = 'md' }: {
  logoUri?: string | null
  name: string
  bankName: string
  color: string
  size?: keyof typeof sizes
}) {
  const [failed, setFailed] = useState(false)

  if (logoUri && !failed) {
    return (
      <div
        className={cn('flex-shrink-0 bg-white border-2 flex items-center justify-center p-1 overflow-hidden', sizes[size])}
        style={{ borderColor: color }}
      >
        <img
          src={logoUri}
          alt={bankName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn('flex-shrink-0 flex items-center justify-center text-white font-bold', sizes[size])}
      style={{ backgroundColor: color }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}
