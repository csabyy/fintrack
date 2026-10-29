import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function formatCurrency(amount: number): string {
  return gbp.format(amount)
}

/** "Today 06:01", "Yesterday 06:01" or "27 Oct 06:01" */
export function formatSyncTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'd MMM')
  return `${day} ${format(d, 'HH:mm')}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function getMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const ACCOUNT_COLORS = [
  '#1E4C8A', // accent blue
  '#A3262A', // red
  '#2B6440', // green
  '#7A4E00', // ochre
  '#6B3F8F', // plum
  '#4A5562', // slate
  '#151B24', // ink
  '#4B78B4', // mid blue
  '#263A57', // navy
  '#5B6B80', // grey blue
]
