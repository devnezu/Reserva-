import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import Brand from '@/components/Brand'
import { notify } from '@/lib/notify'

export default function Account() {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  async function leave() {
    setBusy(true)
    try { await logout(); notify.success('Você saiu da sua conta.') }
    catch { notify.error('Não foi possível sair. Tente novamente.') }
    finally { setBusy(false) }
  }
  return (
    <main className="min-h-svh bg-[#faf8f7] px-6 py-8 text-[#111111] sm:px-12">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-5"><Brand /><Button asChild variant="ghost"><Link to="/">Voltar ao início</Link></Button></header>
      <section className="mx-auto mt-24 max-w-xl rounded-3xl border border-black/10 bg-white p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#ED1C24]">Sua conta</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Olá, {user?.name}!</h1>
        <p className="mt-4 text-neutral-600">{user?.email}</p>
        <p className="mt-6 leading-relaxed text-neutral-600">Seu acesso está confirmado. Você já pode continuar navegando pelo Reservaí.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild className="rounded-full bg-[#ED1C24] hover:bg-[#d0161d]"><Link to="/">Ver próximos jogos</Link></Button><Button variant="outline" onClick={() => { void leave() }} disabled={busy} className="rounded-full">{busy ? 'Saindo…' : 'Sair da conta'}</Button></div>
      </section>
    </main>
  )
}
