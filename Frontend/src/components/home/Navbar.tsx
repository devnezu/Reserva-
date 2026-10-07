import Brand from '@/components/Brand'
import UserMenu from '@/components/UserMenu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

export default function Navbar({ className }: { className?: string }) {
  const { status } = useAuth()
  return (
    <header className={cn('w-full', className)}>
      <nav aria-label="Principal" className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 px-6 py-7 sm:px-12 xl:flex xl:justify-between">
        <div className="col-start-2 flex"><Brand light /></div>
        {status === 'authenticated' && <div className="col-start-3 justify-self-end"><UserMenu /></div>}
      </nav>
    </header>
  )
}
