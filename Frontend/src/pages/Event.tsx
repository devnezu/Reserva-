import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, ArrowUpRight01Icon, Calendar03Icon, Location01Icon, MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import Brand from '@/components/Brand'
import Footer from '@/components/home/Footer'
import { getMatch } from '@/components/home/matches'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

const MAX_TICKETS = 4
const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Event() {
  const { id } = useParams()
  const match = getMatch(id)
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const goToAgenda = useGoToAgenda()
  const [sectorId, setSectorId] = useState(match?.sectors[0]?.id)
  const [quantity, setQuantity] = useState(1)

  if (!match) {
    return (
      <div className="flex min-h-svh flex-col bg-[#faf8f7] text-[#111111]">
        <header className="mx-auto w-full max-w-7xl px-6 pt-7 sm:px-12"><Brand /></header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center sm:px-12">
          <h1 className="text-4xl leading-[0.95] font-extrabold tracking-[-0.03em] uppercase sm:text-5xl">Evento não <span className="text-[#ED1C24]">encontrado</span></h1>
          <p className="text-base text-neutral-700 sm:text-lg">Este evento não existe ou não está mais disponível.</p>
          <Button onClick={goToAgenda} className="h-12 rounded-full bg-[#ED1C24] px-8 text-sm font-bold tracking-wide text-white uppercase hover:bg-[#d0161d]">Ver próximos jogos</Button>
        </main>
        <Footer />
      </div>
    )
  }

  const sector = match.sectors.find((item) => item.id === sectorId) ?? match.sectors[0]
  const title = <>{match.home} <span className="font-light lowercase italic">x</span> {match.away}</>

  function buy() {
    if (status !== 'authenticated') {
      notify.info('Entre na sua conta para comprar.')
      void navigate('/acesso?modo=entrar', { state: { from: location.pathname } })
      return
    }
    notify.info('A compra de ingressos estará disponível em breve.')
  }

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-[#111111]">
      <header className="mx-auto w-full max-w-7xl px-6 pt-7 sm:px-12"><Brand /></header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-6 pt-6 pb-16 sm:px-12">
        <Breadcrumb>
          <BreadcrumbList className="text-neutral-600">
            <BreadcrumbItem><BreadcrumbLink asChild className="hover:text-[#ED1C24]"><Link to="/">Início</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild className="hover:text-[#ED1C24]"><button type="button" onClick={goToAgenda}>Próximos jogos</button></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="font-bold text-[#111111]">{match.home} x {match.away}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10">
          <main className="min-w-0">
            <img src={match.image} alt={`Escudos de ${match.home} e ${match.away}`} className="aspect-[740/475] w-full rounded-3xl border border-black/10 object-cover sm:aspect-[740/380]" />

            <div className="mt-8 flex items-center gap-4 sm:gap-6">
              <img src="/brasileirao-2026.svg" alt={match.competition} className="h-16 w-auto shrink-0 brightness-0 sm:h-20" />
              <h1 className="min-w-0 text-[clamp(1.75rem,6vw,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] uppercase">{title}</h1>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#ED1C24]/10 px-4 py-2 text-sm font-bold text-[#ED1C24] sm:text-base"><HugeiconsIcon icon={Calendar03Icon} size={18} />{match.date} - {match.time}</p>
              <p className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-bold sm:text-base"><HugeiconsIcon icon={Location01Icon} size={18} />{match.venue}</p>
            </div>

            <section aria-labelledby="event-about-title" className="mt-12">
              <h2 id="event-about-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Sobre o <span className="text-[#ED1C24]">jogo</span></h2>
              <div className="mt-5 max-w-2xl space-y-4 text-base leading-relaxed text-neutral-700 sm:text-lg">
                {match.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>

            <section aria-labelledby="event-info-title" className="mt-12">
              <h2 id="event-info-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Antes de <span className="text-[#ED1C24]">ir</span></h2>
              <ul className="mt-5 space-y-3">
                {match.info.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-neutral-700"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ED1C24] text-white"><HugeiconsIcon icon={Tick02Icon} size={14} /></span>{item}</li>
                ))}
              </ul>
            </section>
          </main>

          <aside aria-labelledby="event-tickets-title" className="self-start rounded-3xl border border-black/5 bg-white p-6 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.45)] sm:p-8 lg:sticky lg:top-6">
            <h2 id="event-tickets-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase">Ingressos</h2>

            <fieldset className="mt-6 space-y-3">
              <legend className="mb-3 text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Escolha o setor</legend>
              {match.sectors.map((item) => (
                <label key={item.id} className={cn('flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 px-5 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#ED1C24]', item.id === sector.id ? 'border-[#ED1C24] bg-[#ED1C24]/5' : 'border-black/10 hover:border-black/25')}>
                  <input type="radio" name="sector" value={item.id} checked={item.id === sector.id} onChange={() => setSectorId(item.id)} className="sr-only" />
                  <span className="text-sm font-bold tracking-wide uppercase">{item.name}</span>
                  <span className="text-base font-extrabold">{price.format(item.price)}</span>
                </label>
              ))}
            </fieldset>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Quantidade</p>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex size-10 items-center justify-center rounded-full border border-black/15 transition-colors hover:bg-black/5 disabled:opacity-35"><HugeiconsIcon icon={MinusSignIcon} size={18} /></button>
                <span aria-live="polite" className="w-6 text-center text-lg font-extrabold">{quantity}</span>
                <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= MAX_TICKETS} onClick={() => setQuantity((value) => Math.min(MAX_TICKETS, value + 1))} className="flex size-10 items-center justify-center rounded-full border border-black/15 transition-colors hover:bg-black/5 disabled:opacity-35"><HugeiconsIcon icon={Add01Icon} size={18} /></button>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4 border-t border-black/10 pt-6">
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Total</p>
              <p className="text-3xl leading-none font-extrabold tracking-[-0.03em]">{price.format(sector.price * quantity)}</p>
            </div>

            <Button type="button" onClick={buy} className="mt-6 h-14 w-full gap-4 rounded-full bg-[#ED1C24] px-6 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 transition-transform duration-200 hover:scale-[1.02] hover:bg-[#d0161d] active:scale-100">
              Comprar ingresso <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} />
            </Button>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  )
}
