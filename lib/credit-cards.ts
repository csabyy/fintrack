import { addMonths, differenceInCalendarDays, differenceInCalendarMonths, format, getDaysInMonth, parseISO, startOfDay } from 'date-fns'

export interface CreditCardDates {
  promoEndDate?: string | null
  statementDay?: number | null
  paymentDueDay?: number | null
}

export type CardSort = 'promo' | 'due' | 'statement'

export const CARD_SORT_OPTIONS: Array<{ value: CardSort; label: string }> = [
  { value: 'promo', label: '0% ends soonest' },
  { value: 'due', label: 'Payment due soonest' },
  { value: 'statement', label: 'Next statement' },
]

/** Parses the date part of an ISO string as a local calendar date (ignores the stored UTC time). */
export function parseDateOnly(iso: string): Date {
  return parseISO(iso.slice(0, 10))
}

/** Next occurrence (today included) of a monthly day, clamped to short months (e.g. 31 → 30 Apr). */
export function nextMonthlyDate(day: number, today = new Date()): Date {
  const start = startOfDay(today)
  const inMonth = (month: Date) => new Date(month.getFullYear(), month.getMonth(), Math.min(day, getDaysInMonth(month)))
  const thisMonth = inMonth(start)
  return thisMonth >= start ? thisMonth : inMonth(addMonths(new Date(start.getFullYear(), start.getMonth(), 1), 1))
}

export function daysUntil(date: Date, today = new Date()): number {
  return differenceInCalendarDays(date, today)
}

export function formatCardDate(date: Date, withYear = true): string {
  return format(date, withYear ? 'd MMM yyyy' : 'd MMM')
}

/** "today", "tomorrow", "in 12 days", "in 5 months", "3 days ago" */
export function relativeDays(date: Date, today = new Date()): string {
  const days = daysUntil(date, today)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days < 0) return `${-days} days ago`
  if (days < 60) return `in ${days} days`
  const months = differenceInCalendarMonths(date, today)
  return `in ${months} months`
}

function sortKey(card: CreditCardDates, sort: CardSort, today: Date): number {
  switch (sort) {
    case 'promo': {
      if (!card.promoEndDate) return Number.POSITIVE_INFINITY
      const days = daysUntil(parseDateOnly(card.promoEndDate), today)
      // Running promos first (soonest end), then ended ones (most recent first), then cards without one
      return days >= 0 ? days : 1_000_000 - days
    }
    case 'due':
      return card.paymentDueDay ? daysUntil(nextMonthlyDate(card.paymentDueDay, today), today) : Number.POSITIVE_INFINITY
    case 'statement':
      return card.statementDay ? daysUntil(nextMonthlyDate(card.statementDay, today), today) : Number.POSITIVE_INFINITY
  }
}

export function sortCreditCards<T extends CreditCardDates & { name: string }>(cards: T[], sort: CardSort, today = new Date()): T[] {
  return [...cards].sort((a, b) => {
    const ka = sortKey(a, sort, today)
    const kb = sortKey(b, sort, today)
    if (ka !== kb) return ka < kb ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
