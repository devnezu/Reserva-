import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Clock01Icon } from '@hugeicons/core-free-icons'
import { EVENT_GENRES, type EventRecord } from '@/api/events'
import { Button } from '@/components/ui/button'
import { eventPath, formatEventDate, formatPrice, isEventOpen } from '@/lib/events'
import { cn } from '@/lib/utils'

const LABEL_CLASS = 'block text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase'
const count = new Intl.NumberFormat('pt-BR')

export function EventCard({ event }: { event: EventRecord }) {
  const open = isEventOpen(event)
  const reservation = event.status === 'sold_out' ? 'Ingressos esgotados' : open ? `Reservas até ${formatEventDate(event.expiresAt)}` : 'Reservas encerradas'
  const soldOut = event.available <= 0
  const remaining = event.capacity > 0 ? Math.min(1, Math.max(0, event.available / event.capacity)) : 0
  const lastTickets = !soldOut && remaining <= 0.2
  return (
    <article data-event-id={event.id} className="flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white">
      <div className="relative">
        {event.bannerUrl && <img src={event.bannerUrl} alt={`Banner de ${event.title}`} loading="lazy" className="aspect-[740/475] w-full object-cover" />}
        <p className={cn('flex items-center justify-center gap-2.5 px-5 py-3 text-center text-sm font-extrabold tracking-wide text-white uppercase sm:text-base', event.bannerUrl && 'absolute inset-x-0 bottom-0', open ? 'bg-[#ED1C24]' : 'bg-[#111111]')}><HugeiconsIcon icon={Clock01Icon} size={20} aria-hidden="true" className="shrink-0" />{reservation}</p>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          {event.genre === 'football' && <img src="/brasileirao-2026.svg" alt="Brasileirão" className="h-14 w-auto shrink-0 brightness-0 sm:h-16" />}
          <div className="min-w-0"><p className="text-xs font-bold tracking-widest text-[#ED1C24] uppercase">{EVENT_GENRES[event.genre]}</p><h3 className="mt-1 text-xl leading-tight font-extrabold break-words uppercase sm:text-2xl">{event.title}</h3><p className="mt-2 text-sm font-semibold">{formatEventDate(event.startsAt)}</p><p className="mt-1 text-sm text-neutral-600">{event.location}</p></div>
        </div>
        <div className="border-t border-black/10 pt-5">
          <div className="flex items-end justify-between gap-4">
            <p><span className={LABEL_CLASS}>Por ingresso</span><span className="mt-1 block text-2xl leading-none font-extrabold text-[#ED1C24] sm:text-3xl">{formatPrice(event.unitPriceCents)}</span></p>
            <p className="text-right">
              <span className={cn(LABEL_CLASS, lastTickets && 'text-[#ED1C24]')}>{soldOut ? 'Ingressos' : lastTickets ? (event.available === 1 ? 'Último ingresso' : 'Últimos ingressos') : event.available === 1 ? 'Resta' : 'Restam'}</span>
              <span className="mt-1 block text-2xl leading-none font-extrabold sm:text-3xl">{soldOut ? 'Esgotados' : <>{count.format(event.available)} <span className="text-sm font-bold tracking-wide uppercase">{event.available === 1 ? 'ingresso' : 'ingressos'}</span></>}</span>
            </p>
          </div>
          <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#ED1C24]" style={{ width: `${remaining * 100}%` }} /></div>
        </div>
        {!open ? <Button disabled className="mt-auto h-12 w-full rounded-full">Ingressos indisponíveis</Button> : <Button asChild className="mt-auto h-12 w-full rounded-full bg-[#ED1C24] font-bold text-white uppercase hover:bg-[#d0161d]"><Link to={eventPath(event)}>Comprar ingresso</Link></Button>}
      </div>
    </article>
  )
}
