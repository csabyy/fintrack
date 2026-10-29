import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import ThemeProvider from '@/components/providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'FinTrack — Personal Finance Manager',
  description: 'Track your bank accounts and analyze spending.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EFF1F2' },
    { media: '(prefers-color-scheme: dark)', color: '#151A21' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // next-themes sets the `dark` class on <html> before hydration
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/newsreader-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/publicsans-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased bg-paper text-ink">
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
