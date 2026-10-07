import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { reservationsApi, notifyReservationsChanged, type Reservation, type ReservationResponse } from '@/api/reservations'
import { notifyEventsChanged } from '@/api/events'
import { useServerCountdown } from '@/hooks/use-server-countdown'
import { formatEventDate, formatPrice } from '@/lib/events'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'

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
  return <article data-reservation-id={reservation.id} className="overflow-hidden rounded-3xl border border-black/10 bg-white">
    {detail && reservation.event.bannerUrl && <img src={reservation.event.bannerUrl} alt={reservation.event.title} className="aspect-[16/6] w-full object-cover" />}
    <div className="space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="max-w-xl text-2xl leading-tight font-extrabold tracking-tight uppercase"><Link to={`/eventos/${reservation.event.slug}`} className="hover:text-[#ED1C24]">{reservation.event.title}</Link></h2><span data-reservation-status={reservation.status} className={`rounded-full px-3 py-1 text-xs font-bold ${state.color}`}>{state.label}</span></div>
      <p className="text-sm text-neutral-600">{formatEventDate(reservation.event.startsAt)} · {reservation.event.location}</p>
      <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-[#faf8f7] p-4 sm:grid-cols-3"><div><dt className="text-xs text-neutral-600">Ingressos</dt><dd className="mt-1 text-lg font-bold">{reservation.quantity}</dd></div><div><dt className="text-xs text-neutral-600">Preço unitário</dt><dd className="mt-1 text-lg font-bold">{formatPrice(reservation.unitPriceCents)}</dd></div><div><dt className="text-xs text-neutral-600">Total</dt><dd className="mt-1 text-xl font-extrabold text-[#ED1C24]">{formatPrice(reservation.totalCents)}</dd></div></dl>
      <p className="text-sm text-neutral-700">{pending && countdown.remaining === 0 ? 'Prazo encerrado. Verificando o estado da reserva…' : state.description}</p>
      {pending && <div className="rounded-2xl bg-[#ED1C24]/5 p-4"><p className="text-xs font-semibold text-neutral-600">Tempo para confirmar</p><p role="timer" aria-label="Tempo restante da reserva" className="mt-1 text-4xl font-extrabold text-[#ED1C24] tabular-nums">{countdown.label}</p><p className="mt-2 text-xs text-neutral-600">Prazo: {formatEventDate(reservation.expiresAt)}</p></div>}
      {pending && <div className="flex flex-col gap-3 sm:flex-row"><Button disabled={!!busy || countdown.remaining === 0} onClick={() => { void action('confirm') }} className="h-12 rounded-full bg-[#ED1C24] px-6 font-bold text-white uppercase hover:bg-[#d0161d]">{busy === 'confirm' ? 'Confirmando…' : 'Confirmar compra simulada'}</Button><Button disabled={!!busy || countdown.remaining === 0} onClick={() => { void action('cancel') }} variant="outline" className="h-12 rounded-full px-6 font-bold uppercase">{busy === 'cancel' ? 'Cancelando…' : 'Cancelar reserva'}</Button></div>}
      <p className="border-t border-black/10 pt-4 text-xs text-neutral-500">Criada em {formatEventDate(reservation.createdAt)}</p>
    </div>
  </article>
}
