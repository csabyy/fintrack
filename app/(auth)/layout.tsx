import ThemeToggle from '@/components/ui/ThemeToggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-md flex items-center justify-center">
              <span className="font-serif text-on-accent text-xl">F</span>
            </div>
            <span className="font-serif text-slate-900 text-3xl">FinTrack</span>
          </div>
          <p className="text-slate-500 text-sm">Your personal finance command center</p>
        </div>
        {children}
      </div>
    </div>
  )
}
