import { Link, Outlet } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-[#faf8f7] px-6 text-center"><h1 className="text-2xl font-bold">Acesso exclusivo para administradores</h1><Button asChild><Link to="/">Voltar ao início</Link></Button></main>
  return <Outlet />
}
