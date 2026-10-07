import { useState } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon, Logout01Icon, Mail01Icon, UserIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/home/Navbar'
import { featuredMatch } from '@/components/home/matches'
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
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-[#111111]">
      <div className="relative bg-[#ED1C24] text-white">
        <Navbar className="relative z-10" />
        <section aria-labelledby="account-title" className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-6 pt-4 pb-24 text-center sm:px-12 md:flex-row md:justify-between md:pt-8 md:pb-28 md:text-left">
          <div className="min-w-0">
            <h1 id="account-title" className="text-[clamp(2.25rem,9vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] break-words uppercase">Olá, {user?.name}!</h1>
            <p className="mt-4 text-base text-white/90 sm:text-lg">Seu acesso está confirmado. Você já pode continuar navegando pelo Reservaí.</p>
          </div>
          <img src="/MascoteSucesso.webp" alt="" className="h-24 w-auto shrink-0 drop-shadow-[0_14px_20px_rgba(0,0,0,0.25)] sm:h-28" />
        </section>
        <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px h-10 w-full fill-[#faf8f7] sm:h-14">
          <path opacity="0.45" d="M0,30 C220,70 460,0 720,24 C980,48 1210,4 1440,34 L1440,80 L0,80 Z" />
          <path d="M0,52 C240,84 480,22 720,42 C960,62 1200,18 1440,46 L1440,80 L0,80 Z" />
        </svg>
      </div>

      <main className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-8 px-6 py-14 sm:px-12 lg:grid-cols-2">
        <section aria-labelledby="account-data-title" className="flex flex-col rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
          <h2 id="account-data-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Seus <span className="text-[#ED1C24]">dados</span></h2>
          <dl className="mt-8 space-y-3">
            <div className="flex items-center gap-4 bg-[#f0eceb] px-5 py-4">
              <HugeiconsIcon icon={UserIcon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
              <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Nome</dt><dd className="truncate text-base font-semibold">{user?.name}</dd></div>
            </div>
            <div className="flex items-center gap-4 bg-[#f0eceb] px-5 py-4">
              <HugeiconsIcon icon={Mail01Icon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
              <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">E-mail</dt><dd className="truncate text-base font-semibold">{user?.email}</dd></div>
            </div>
          </dl>
          <Button variant="outline" onClick={() => { void leave() }} disabled={busy} className="mt-8 h-12 gap-3 self-start rounded-full border-black/20 bg-transparent px-7 text-sm font-bold tracking-wide uppercase shadow-none lg:mt-auto">
            <HugeiconsIcon icon={Logout01Icon} size={18} />{busy ? 'Saindo…' : 'Sair da conta'}
          </Button>
        </section>

        <section aria-labelledby="account-match-title" className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white">
          <img src={featuredMatch.image} alt={`Escudos de ${featuredMatch.home} e ${featuredMatch.away}`} className="aspect-[740/320] w-full object-cover" />
          <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <img src="/brasileirao-2026.svg" alt={featuredMatch.competition} className="h-14 w-auto shrink-0 brightness-0 sm:h-16" />
              <div className="min-w-0">
                <h2 id="account-match-title" className="text-sm leading-tight font-semibold tracking-[-0.03em] whitespace-nowrap uppercase min-[420px]:text-base sm:text-2xl lg:text-lg xl:text-[22px]">{featuredMatch.home} <span className="font-light lowercase italic">x</span> {featuredMatch.away}</h2>
                <p className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#ED1C24]/10 px-3.5 py-1.5 text-sm font-bold text-[#ED1C24] sm:text-base"><HugeiconsIcon icon={Calendar03Icon} size={18} />{featuredMatch.date} - {featuredMatch.time}</p>
              </div>
            </div>
            <Button asChild className="mt-auto h-12 w-full gap-4 rounded-full bg-[#ED1C24] px-6 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 transition-transform duration-200 hover:scale-[1.02] hover:bg-[#d0161d] active:scale-100">
              <Link to="/">Ver próximos jogos <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} /></Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
