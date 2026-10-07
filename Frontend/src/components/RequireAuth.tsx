import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export function RequireAuth() {
  const { status, refresh } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <main role="status" className="flex min-h-svh items-center justify-center bg-[#faf8f7] text-neutral-600">Verificando seu acesso…</main>
  if (status === 'error') return <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-[#faf8f7] px-6 text-center"><p>Não foi possível verificar seu acesso.</p><Button onClick={() => { void refresh() }}>Tentar novamente</Button></main>
  if (status !== 'authenticated') return <Navigate to="/acesso?modo=entrar" replace state={{ from: location.pathname + location.search + location.hash }} />
  return <Outlet />
}
