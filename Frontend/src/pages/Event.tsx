import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Calendar03Icon, Location01Icon, MinusSignIcon } from '@hugeicons/core-free-icons'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import Brand from '@/components/Brand'
import Footer from '@/components/home/Footer'
import { EVENT_GENRES, type EventRecord } from '@/api/events'
import { useEvent } from '@/hooks/use-event'
import { MarkdownContent } from '@/components/events/MarkdownContent'
import { EVENT_STATUS, formatEventDate, formatPrice, isEventOpen } from '@/lib/events'
import { ReserveButton } from '@/components/reservations/ReserveButton'
import { LoadingOverlay } from '@/components/LoadingOverlay'

const MAX_TICKETS = 4

export default function Event() {
  const { id = '' } = useParams()
  const { event, loading, notFound, error, refresh } = useEvent(id)
  const goToAgenda = useGoToAgenda()
  if (!event) {
    return (
      <div className="flex min-h-svh flex-col bg-[#faf8f7] text-[#111111]">
        <header className="mx-auto w-full max-w-7xl px-6 pt-7 sm:px-12"><Brand /></header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center sm:px-12">
          {loading ? <LoadingOverlay label="Carregando evento" /> : <><h1 className="text-4xl leading-[0.95] font-extrabold tracking-[-0.03em] uppercase sm:text-5xl">{notFound ? <>Evento não <span className="text-[#ED1C24]">encontrado</span></> : 'Não foi possível carregar o evento'}</h1><p role={notFound ? undefined : 'alert'} className="text-base text-neutral-700 sm:text-lg">{notFound ? 'Este evento não existe ou não está mais disponível.' : error}</p>{!notFound && <Button onClick={refresh} variant="outline">Tentar novamente</Button>}<Button onClick={goToAgenda} className="h-12 rounded-full bg-[#ED1C24] px-8 text-sm font-bold tracking-wide text-white uppercase hover:bg-[#d0161d]">Ver próximos jogos</Button></>}
        </main>
        <Footer />
      </div>
    )
  }

  return <EventDetails key={event.id} event={event} refreshError={error} onRetry={refresh} />
}

function EventDetails({ event, refreshError, onRetry }: { event: EventRecord; refreshError?: string; onRetry: () => void }) {
  const goToAgenda = useGoToAgenda()
  const [quantity, setQuantity] = useState(1)
  const open = isEventOpen(event)
  const maximum = Math.min(MAX_TICKETS, event.available)
  const selectedQuantity = Math.min(quantity, maximum)
  const totalCents = event.unitPriceCents * selectedQuantity

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
            <BreadcrumbItem><BreadcrumbPage className="font-bold text-[#111111]">{event.title}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {refreshError && <div role="alert" className="mt-5 rounded-xl border border-[#ED1C24]/20 bg-white p-4 text-sm"><p>Não foi possível atualizar as informações. {refreshError}</p><Button onClick={onRetry} variant="outline" className="mt-3">Tentar novamente</Button></div>}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10">
          <main className="min-w-0">
            {event.bannerUrl && <img src={event.bannerUrl} alt={`Banner de ${event.title}`} className="aspect-[740/475] w-full rounded-3xl border border-black/10 object-cover sm:aspect-[740/380]" />}

            <p className="mt-8 text-xs font-bold tracking-widest text-[#ED1C24] uppercase">{EVENT_GENRES[event.genre]}</p>
            <h1 className="mt-2 text-[clamp(1.75rem,6vw,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] break-words uppercase">{event.title}</h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#ED1C24]/10 px-4 py-2 text-sm font-bold text-[#ED1C24] sm:text-base"><HugeiconsIcon icon={Calendar03Icon} size={18} />{formatEventDate(event.startsAt)}</p>
              <p className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-bold sm:text-base"><HugeiconsIcon icon={Location01Icon} size={18} />{event.location}</p>
            </div>
            <p className="mt-3 text-sm text-neutral-500">Término: {formatEventDate(event.endsAt)}</p>

            <section aria-labelledby="event-about-title" className="mt-12">
              <h2 id="event-about-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Sobre o <span className="text-[#ED1C24]">{event.genre === 'football' ? 'jogo' : 'evento'}</span></h2>
              <div className="mt-5 max-w-2xl">{event.content?.trim() ? <MarkdownContent content={event.content} /> : <p className="text-base text-neutral-600">As informações deste evento serão publicadas em breve.</p>}</div>
            </section>
          </main>

          <aside aria-labelledby="event-tickets-title" className="self-start rounded-3xl border border-black/5 bg-white p-6 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.45)] sm:p-8 lg:sticky lg:top-6">
            <h2 id="event-tickets-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase">Ingressos</h2>

            <div className="mt-6 rounded-2xl border-2 border-[#ED1C24] bg-[#ED1C24]/5 px-5 py-4"><p className="text-xs font-bold tracking-wide uppercase">Preço unitário</p><p className="mt-2 text-2xl font-extrabold">{formatPrice(event.unitPriceCents)}</p></div>
            <p className="mt-5 text-sm font-semibold">{event.available} de {event.capacity} ingressos disponíveis</p>
            <p className="mt-2 text-xs text-neutral-600">Reservas até {formatEventDate(event.expiresAt)}</p>
            {!open && <p role="status" className="mt-3 text-sm font-bold text-[#ED1C24]">{event.status === 'open' ? 'Reservas encerradas' : EVENT_STATUS[event.status]}</p>}

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Quantidade</p>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Diminuir quantidade" disabled={!open || selectedQuantity <= 1} onClick={() => setQuantity(Math.max(1, selectedQuantity - 1))} className="flex size-10 items-center justify-center rounded-full border border-black/15 transition-colors hover:bg-black/5 disabled:opacity-35"><HugeiconsIcon icon={MinusSignIcon} size={18} /></button>
                <output aria-label="Quantidade de ingressos" aria-live="polite" className="w-6 text-center text-lg font-extrabold">{selectedQuantity}</output>
                <button type="button" aria-label="Aumentar quantidade" disabled={!open || selectedQuantity >= maximum} onClick={() => setQuantity(Math.min(maximum, selectedQuantity + 1))} className="flex size-10 items-center justify-center rounded-full border border-black/15 transition-colors hover:bg-black/5 disabled:opacity-35"><HugeiconsIcon icon={Add01Icon} size={18} /></button>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4 border-t border-black/10 pt-6">
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Total</p>
              <p data-event-total className="text-3xl leading-none font-extrabold tracking-[-0.03em]">{formatPrice(totalCents)}</p>
            </div>

            <ReserveButton event={event} quantity={selectedQuantity} open={open} onRefresh={onRetry} />
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  )
}
