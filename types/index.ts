import type { BankAccount, Transaction, Category } from '@prisma/client'

export type AccountWithTransactions = BankAccount & {
  transactions: Transaction[]
  _count?: { transactions: number }
}

export type TransactionWithCategory = Transaction & {
  category: Category | null
  account?: BankAccount
  transferTo?: BankAccount | null
}

export type AccountWithStats = BankAccount & {
  _count: { transactions: number }
  transactions: Transaction[]
}

export type MonthlyData = {
  month: string
  income: number
  expenses: number
  net: number
}

export type CategorySummary = {
  name: string
  total: number
  color: string
  icon?: string
  count: number
}

export type DashboardStats = {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netChange: number
  accountCount: number
  transactionCount: number
}

// Extend NextAuth session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
