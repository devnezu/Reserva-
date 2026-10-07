import Brand from '@/components/Brand'
import { cn } from '@/lib/utils'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function Navbar({ className }: { className?: string }) {
  const { user, status } = useAuth()
  return (
    <header className={cn('w-full', className)}>
      <nav aria-label="Principal" className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 px-6 py-7 sm:px-12 xl:flex xl:justify-between">
        <div className="col-start-2 flex"><Brand light /></div>
        {status === 'authenticated' && <Button asChild variant="ghost" className="col-start-3 max-w-full justify-self-end rounded-full text-white hover:bg-white hover:text-black"><Link to="/conta"><span className="truncate">Olá, {user?.name}</span></Link></Button>}
      </nav>
    </header>
  )
}
