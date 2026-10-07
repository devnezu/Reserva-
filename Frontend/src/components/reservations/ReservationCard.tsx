import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, Location01Icon } from '@hugeicons/core-free-icons'
import { reservationsApi, notifyReservationsChanged, type Reservation, type ReservationResponse } from '@/api/reservations'
import { notifyEventsChanged } from '@/api/events'
import { useServerCountdown } from '@/hooks/use-server-countdown'
import { formatEventDate, formatPrice } from '@/lib/events'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { ReservationCode } from './ReservationCode'

const LABEL_CLASS = 'text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase'
const STATES = {
  PENDENTE: { label: 'Pendente', color: 'bg-amber-100 text-amber-900', description: 'Confirme sua compra antes do prazo. Seus ingressos estão reservados.' },
  CONFIRMADA: { label: 'Confirmada', color: 'bg-emerald-600 text-white', description: 'Compra simulada confirmada. Seus ingressos estão garantidos.' },
  CANCELADA: { label: 'Cancelada', color: 'bg-[#ED1C24] text-white', description: 'Reserva cancelada. Os ingressos voltaram a ficar disponíveis.' },
  EXPIRADA: { label: 'Expirada', color: 'bg-red-100 text-red-900', description: 'O prazo de 5 minutos encerrou. Você pode fazer uma nova reserva se houver disponibilidade.' },
}
export function ReservationCard({ reservation: incoming, serverTime: incomingTime, onRefresh, detail = false }: { reservation: Reservation; serverTime: number; onRefresh: () => void; detail?: boolean }) {
  const [response, setResponse] = useState<ReservationResponse | null>(null)
  const newer = response && response.reservation.id === incoming.id && response.reservation.version > incoming.version
  const reservation = newer ? response.reservation : incoming
  const serverTime = newer ? response.serverTime : incomingTime
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null)
  const lock = useRef(false)
  const expired = useRef('')
  const pending = reservation.status === 'PENDENTE'
  const countdown = useServerCountdown(reservation.expiresAt, serverTime, pending)
  const state = STATES[reservation.status]
  useEffect(() => {
    const key = `${reservation.id}:${reservation.version}`
    if (pending && countdown.remaining === 0 && expired.current !== key) { expired.current = key; onRefresh(); notifyEventsChanged() }
  }, [pending, countdown.remaining, reservation.id, reservation.version, onRefresh])
  async function action(kind: 'confirm' | 'cancel') {
    if (lock.current) return
    lock.current = true; setBusy(kind)
    try {
      const data = await reservationsApi[kind](reservation.id)
      setResponse(data)
      notify.success(kind === 'confirm' ? 'Compra simulada confirmada!' : 'Reserva cancelada.')
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação.') }
    finally { lock.current = false; setBusy(null); notifyReservationsChanged(); notifyEventsChanged(); onRefresh() }
  }
  // Na lista a reserva é um ingresso compacto; os detalhes e as ações ficam em "Ver reserva".
  if (!detail) return (
    <article data-reservation-id={reservation.id} className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white sm:flex-row">
      <div className="min-w-0 flex-1 p-5 sm:p-6">
        <span data-reservation-status={reservation.status} className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${state.color}`}>{state.label}</span>
        <h2 className="mt-3 text-lg leading-tight font-extrabold tracking-[-0.02em] break-words uppercase sm:text-xl">{reservation.event.title}</h2>
        <p className="mt-1.5 text-sm text-neutral-600">{formatEventDate(reservation.event.startsAt)} · {reservation.event.location}</p>
      </div>
      <div className="relative flex items-center justify-between gap-4 border-t-2 border-dashed border-black/15 p-5 sm:w-60 sm:shrink-0 sm:flex-col sm:items-stretch sm:justify-center sm:border-t-0 sm:border-l-2 sm:p-6">
        <span aria-hidden="true" className="absolute -top-3.5 -left-3 size-6 rounded-full border border-black/10 bg-[#faf8f7] sm:-top-3 sm:-left-3.5" />
        <span aria-hidden="true" className="absolute -top-3.5 -right-3 size-6 rounded-full border border-black/10 bg-[#faf8f7] sm:top-auto sm:right-auto sm:-bottom-3 sm:-left-3.5" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">{reservation.quantity} {reservation.quantity === 1 ? 'ingresso' : 'ingressos'}</p>
          <p className="mt-1 text-xl leading-none font-extrabold">{formatPrice(reservation.totalCents)}</p>
          {pending && <p className="mt-2 text-xs font-bold text-[#ED1C24] uppercase">Confirme em <span role="timer" aria-label="Tempo restante da reserva" className="tabular-nums">{countdown.label}</span></p>}
        </div>
        <Button asChild className="h-11 shrink-0 rounded-full bg-[#ED1C24] px-6 text-xs font-bold tracking-wide text-white uppercase hover:bg-[#d0161d]"><Link to={`/reservas/${reservation.id}`}>Ver reserva</Link></Button>
      </div>
    </article>
  )
  return (
    <article data-reservation-id={reservation.id} className="overflow-hidden rounded-3xl border border-black/10 bg-white">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-4 sm:gap-6">
          {reservation.event.bannerUrl && <img src={reservation.event.bannerUrl} alt="" className="h-20 w-28 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-36" />}
          <div className="min-w-0">
            <span data-reservation-status={reservation.status} className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${state.color}`}>{state.label}</span>
            <h2 className="mt-3 text-xl leading-[0.95] font-extrabold tracking-[-0.03em] break-words uppercase sm:text-3xl"><Link to={`/eventos/${reservation.event.slug}`} className="transition-colors hover:text-[#ED1C24]">{reservation.event.title}</Link></h2>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#ED1C24]/10 px-4 py-2 text-sm font-bold text-[#ED1C24]"><HugeiconsIcon icon={Calendar03Icon} size={18} />{formatEventDate(reservation.event.startsAt)}</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-black/5 px-4 py-2 text-sm font-bold"><HugeiconsIcon icon={Location01Icon} size={18} />{reservation.event.location}</p>
        </div>
        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="bg-[#f0eceb] px-5 py-4"><dt className={LABEL_CLASS}>Ingressos</dt><dd className="mt-1 text-2xl leading-none font-extrabold">{reservation.quantity}</dd></div>
          <div className="bg-[#f0eceb] px-5 py-4"><dt className={LABEL_CLASS}>Preço unitário</dt><dd className="mt-1 text-2xl leading-none font-extrabold">{formatPrice(reservation.unitPriceCents)}</dd></div>
          <div className="bg-[#f0eceb] px-5 py-4"><dt className={LABEL_CLASS}>Total</dt><dd className="mt-1 text-2xl leading-none font-extrabold text-[#ED1C24]">{formatPrice(reservation.totalCents)}</dd></div>
        </dl>
      </div>

      <div className="relative border-t-2 border-dashed border-black/15 p-6 sm:p-8">
        <span aria-hidden="true" className="absolute -top-3.5 -left-3 size-6 rounded-full border border-black/10 bg-[#faf8f7]" />
        <span aria-hidden="true" className="absolute -top-3.5 -right-3 size-6 rounded-full border border-black/10 bg-[#faf8f7]" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {pending && <>
              <p className={LABEL_CLASS}>Tempo para confirmar</p>
              <p role="timer" aria-label="Tempo restante da reserva" className="mt-1 text-5xl leading-none font-extrabold tracking-[-0.03em] text-[#ED1C24] tabular-nums">{countdown.label}</p>
            </>}
            <p className={pending ? 'mt-3 max-w-md text-sm text-neutral-700' : 'max-w-md text-base font-semibold'}>{pending && countdown.remaining === 0 ? 'Prazo encerrado. Verificando o estado da reserva…' : state.description}</p>
            <p className="mt-2 text-xs text-neutral-600">{pending && <>Prazo: {formatEventDate(reservation.expiresAt)} · </>}Criada em {formatEventDate(reservation.createdAt)}</p>
          </div>
          {pending
            ? <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Button disabled={!!busy || countdown.remaining === 0} onClick={() => { void action('confirm') }} className="h-12 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]">{busy === 'confirm' ? 'Confirmando…' : 'Pagar compra simulada'}</Button>
                <Button disabled={!!busy || countdown.remaining === 0} onClick={() => { void action('cancel') }} variant="outline" className="h-12 rounded-full border-black/15 bg-transparent px-7 text-sm font-bold tracking-wide uppercase shadow-none">{busy === 'cancel' ? 'Cancelando…' : 'Cancelar reserva'}</Button>
              </div>
            : <Button asChild variant="outline" className="h-12 shrink-0 rounded-full border-black/15 bg-transparent px-7 text-sm font-bold tracking-wide uppercase shadow-none"><Link to={`/eventos/${reservation.event.slug}`}>Ver evento</Link></Button>}
        </div>
        {reservation.status === 'CONFIRMADA' && <ReservationCode key={reservation.id} code={reservation.id} />}
      </div>
    </article>
  )
}
