import { Link } from 'react-router'
import { EVENT_GENRES, type EventRecord } from '@/api/events'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { formatEventDate, formatPrice, isEventOpen } from '@/lib/events'
import { matches, matchPath } from '@/components/home/matches'
import { notify } from '@/lib/notify'

export function EventCard({ event }: { event: EventRecord }) {
  const { status } = useAuth()
  const open = isEventOpen(event)
  // Preserve links to the separate, still-static event page without integrating it.
  const legacyMatch = matches.find((match) => event.title === `${match.home} x ${match.away}`)
  return (
    <article data-event-id={event.id} className="flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white">
      {event.bannerUrl && <img src={event.bannerUrl} alt={`Banner de ${event.title}`} loading="lazy" className="aspect-[740/475] w-full object-cover" />}
      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          {event.genre === 'football' && <img src="/brasileirao-2026.svg" alt="Brasileirão" className="h-14 w-auto shrink-0 brightness-0 sm:h-16" />}
          <div className="min-w-0"><p className="text-xs font-bold tracking-widest text-[#ED1C24] uppercase">{EVENT_GENRES[event.genre]}</p><h3 className="mt-1 text-xl leading-tight font-extrabold break-words uppercase sm:text-2xl">{event.title}</h3><p className="mt-2 text-sm font-semibold">{formatEventDate(event.startsAt)}</p><p className="mt-1 text-sm text-neutral-600">{event.location}</p></div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-black/10 pt-4"><p className="text-2xl font-extrabold text-[#ED1C24]">{formatPrice(event.unitPriceCents)}<span className="block text-xs font-medium text-neutral-500">por ingresso</span></p><p className="text-sm font-semibold">{event.available} de {event.capacity} disponíveis</p></div>
        <p className="text-xs text-neutral-500">Reservas até {formatEventDate(event.expiresAt)}</p>
        {!open ? <Button disabled className="mt-auto h-12 w-full rounded-full">Ingressos indisponíveis</Button> : legacyMatch || status !== 'authenticated' ? <Button asChild className="mt-auto h-12 w-full rounded-full bg-[#ED1C24] font-bold text-white uppercase hover:bg-[#d0161d]"><Link to={legacyMatch ? matchPath(legacyMatch) : '/acesso?modo=entrar'}>Comprar ingresso</Link></Button> : <Button onClick={() => notify.info('A página deste evento estará disponível em breve.')} className="mt-auto h-12 w-full rounded-full bg-[#ED1C24] font-bold text-white uppercase hover:bg-[#d0161d]">Comprar ingresso</Button>}
      </div>
    </article>
  )
}
