import { useState } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon, Logout01Icon, Mail01Icon, UserCircleIcon, UserIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import Navbar from '@/components/home/Navbar'
import { featuredMatch } from '@/components/home/matches'
import { notify } from '@/lib/notify'
import { ProfilePhoto } from '@/components/ProfilePhoto'
import { UserAvatar } from '@/components/UserAvatar'

const SIDEBAR_ITEM_CLASS = 'flex w-full items-center gap-3 rounded-full px-5 py-3 text-left text-sm font-bold tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ED1C24] disabled:opacity-50'

export default function Account() {
  const { user, logout } = useAuth()
  const goToAgenda = useGoToAgenda()
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
        <section aria-labelledby="account-title" className="mx-auto w-full max-w-7xl px-6 pt-4 pb-32 text-center sm:px-12 md:pt-8 md:pb-36 md:text-left">
          <h1 id="account-title" className="text-[clamp(2.25rem,9vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] break-words uppercase">Olá, {user?.name}!</h1>
          <p className="mt-4 text-base text-white/90 sm:text-lg">Seu acesso está confirmado. Você já pode continuar navegando pelo Reservaí.</p>
        </section>
        <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px h-10 w-full fill-[#faf8f7] sm:h-14">
          <path opacity="0.45" d="M0,30 C220,70 460,0 720,24 C980,48 1210,4 1440,34 L1440,80 L0,80 Z" />
          <path d="M0,52 C240,84 480,22 720,42 C960,62 1200,18 1440,46 L1440,80 L0,80 Z" />
        </svg>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-8 px-6 pb-14 sm:px-12 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Menu da conta" className="relative z-10 -mt-20 self-start rounded-3xl border border-black/5 bg-white p-5 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.45)] lg:sticky lg:top-6">
          <div className="flex items-center gap-4 border-b border-black/10 pb-5">
            <UserAvatar user={user} className="size-14 bg-[#ED1C24] text-white ring-4 ring-[#ED1C24]/15" />
            <div className="min-w-0">
              <p className="truncate text-base leading-tight font-extrabold uppercase">{user?.name}</p>
              <p className="mt-0.5 truncate text-xs text-neutral-600">{user?.email}</p>
            </div>
          </div>
          <nav aria-label="Seções da conta" className="mt-4 space-y-1">
            <a href="#seus-dados" aria-current="page" className={`${SIDEBAR_ITEM_CLASS} bg-[#ED1C24] text-white`}><HugeiconsIcon icon={UserCircleIcon} size={18} />Meus dados</a>
            <button type="button" onClick={goToAgenda} className={`${SIDEBAR_ITEM_CLASS} hover:bg-black/5`}><HugeiconsIcon icon={Calendar03Icon} size={18} />Próximos jogos</button>
          </nav>
          <div className="mt-4 border-t border-black/10 pt-4">
            <button type="button" onClick={() => { void leave() }} disabled={busy} className={`${SIDEBAR_ITEM_CLASS} text-[#ED1C24] hover:bg-[#ED1C24]/10`}><HugeiconsIcon icon={Logout01Icon} size={18} />{busy ? 'Saindo…' : 'Sair da conta'}</button>
          </div>
        </aside>

        <main className="min-w-0 space-y-8 lg:pt-8">
          <Breadcrumb>
            <BreadcrumbList className="text-neutral-600">
              <BreadcrumbItem><BreadcrumbLink asChild className="hover:text-[#ED1C24]"><Link to="/">Início</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage className="font-bold text-[#111111]">Minha conta</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <section id="seus-dados" aria-labelledby="account-data-title" className="scroll-mt-6 rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
            <h2 id="account-data-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Seus <span className="text-[#ED1C24]">dados</span></h2>
            <ProfilePhoto />
            <dl className="mt-8 grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-4 bg-[#f0eceb] px-5 py-4">
                <HugeiconsIcon icon={UserIcon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
                <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Nome</dt><dd className="truncate text-base font-semibold">{user?.name}</dd></div>
              </div>
              <div className="flex items-center gap-4 bg-[#f0eceb] px-5 py-4">
                <HugeiconsIcon icon={Mail01Icon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
                <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">E-mail</dt><dd className="truncate text-base font-semibold">{user?.email}</dd></div>
              </div>
            </dl>
          </section>

          <section aria-labelledby="account-match-title" className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white md:flex-row">
            <img src={featuredMatch.image} alt={`Escudos de ${featuredMatch.home} e ${featuredMatch.away}`} className="aspect-[740/320] w-full object-cover md:aspect-auto md:w-2/5" />
            <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <img src="/brasileirao-2026.svg" alt={featuredMatch.competition} className="h-14 w-auto shrink-0 brightness-0 sm:h-16" />
                <div className="min-w-0">
                  <h2 id="account-match-title" className="text-sm leading-tight font-semibold tracking-[-0.03em] uppercase min-[420px]:text-base sm:text-xl">{featuredMatch.home} <span className="font-light lowercase italic">x</span> {featuredMatch.away}</h2>
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
    </div>
  )
}
