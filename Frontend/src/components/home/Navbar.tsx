import Brand from '@/components/Brand'
import { cn } from '@/lib/utils'

export default function Navbar({ className }: { className?: string }) {
  return (
    <header className={cn('w-full', className)}>
      <nav aria-label="Principal" className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 sm:px-12">
        <Brand light />
      </nav>
    </header>
  )
}
