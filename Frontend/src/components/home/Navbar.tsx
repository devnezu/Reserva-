import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import Brand from '@/components/Brand'
import { cn } from '@/lib/utils'

export default function Navbar({ className }: { className?: string }) {
  return (
    <header className={cn('w-full', className)}>
      <nav aria-label="Principal" className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 sm:px-12">
        <Brand light />
        <Button asChild variant="ghost" className="gap-3 rounded-full text-xs font-semibold text-white hover:bg-white hover:text-black sm:text-sm">
          <Link to="/acesso?modo=entrar">Minha conta <HugeiconsIcon icon={ArrowUpRight01Icon} /></Link>
        </Button>
      </nav>
    </header>
  )
}
