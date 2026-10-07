import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ApiError } from '@/api/auth'
import { notifyEventsChanged, type EventRecord } from '@/api/events'
import { reservationsApi, notifyReservationsChanged, REALTIME_MESSAGE, type RealtimeMessage, type Reservation } from '@/api/reservations'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { RealtimeStatus } from './RealtimeStatus'

interface Attempt { key: string; eventId: number; quantity: number }
interface Props { event: EventRecord; quantity: number; open: boolean; onRefresh: () => void }
function savedAttempt(storageKey: string, eventId: number): Attempt | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Attempt | null
    if (saved && saved.eventId === eventId && typeof saved.key === 'string' && Number.isInteger(saved.quantity) && saved.quantity >= 1 && saved.quantity <= 4) return saved
  } catch {}
  return null
}
export function ReserveButton(props: Props) {
  const { user } = useAuth()
  return <ReserveAction key={`${user?.id}:${props.event.id}`} {...props} />
}
function ReserveAction({ event, quantity, open, onRefresh }: Props) {
  const { user, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const storageKey = `reservai:attempt:${user?.id}:${event.id}`
  const [initialAttempt] = useState(() => savedAttempt(storageKey, event.id))
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(!!initialAttempt)
  const attempt = useRef<Attempt | null>(initialAttempt)
  const lock = useRef(false)
  const completeRef = useRef<(reservation?: Reservation, message?: string) => void>(() => {})
  function clear() { attempt.current = null; try { sessionStorage.removeItem(storageKey) } catch {} }
  function complete(reservation?: Reservation, message?: string) {
    if (!attempt.current) return
    clear(); lock.current = false; setBusy(false); setUncertain(false)
    notifyEventsChanged(); notifyReservationsChanged(); onRefresh()
    if (reservation) { notify.success(reservation.status === 'PENDENTE' ? 'Ingressos reservados por 5 minutos.' : 'Sua tentativa anterior foi recuperada.'); void navigate(`/reservas/${reservation.id}`) }
    else notify.error(message ?? 'Não foi possível reservar os ingressos.')
  }
  useEffect(() => { completeRef.current = complete })
  useEffect(() => {
    attempt.current = initialAttempt
    const onResult = (raw: Event) => {
      const message = (raw as CustomEvent<RealtimeMessage>).detail
      if (message.type !== 'reservation.result' || message.data.requestId !== attempt.current?.key) return
      completeRef.current(message.data.success ? message.data.reservation : undefined, message.data.message)
    }
    window.addEventListener(REALTIME_MESSAGE, onResult)
    return () => { window.removeEventListener(REALTIME_MESSAGE, onResult); attempt.current = null }
  }, [initialAttempt])
  async function reserve() {
    if (lock.current) return
    if (status !== 'authenticated') { notify.info('Entre na sua conta para reservar.'); void navigate('/acesso?modo=entrar', { state: { from: location.pathname } }); return }
    if (!open && !attempt.current) return
    lock.current = true; setBusy(true)
    const current = attempt.current ?? { key: crypto.randomUUID(), eventId: event.id, quantity }
    attempt.current = current
    try { sessionStorage.setItem(storageKey, JSON.stringify(current)) } catch {}
    try {
      const { reservation } = await reservationsApi.create(current.eventId, current.quantity, current.key)
      if (attempt.current?.key === current.key) complete(reservation)
    } catch (error) {
      if (attempt.current?.key !== current.key) return
      // Throttling does not tell us whether an earlier attempt committed. Keep
      // its key so retrying a lost response never creates a second reservation.
      if (error instanceof ApiError && error.status < 500 && ![408, 429].includes(error.status)) complete(undefined, error.message)
      else { setUncertain(true); notify.warning('Não recebemos a confirmação.', 'Tente novamente para verificar a mesma tentativa, sem duplicar a reserva.') }
    } finally { if (!attempt.current || attempt.current.key === current.key) { lock.current = false; setBusy(false) } }
  }
  return <div className="mt-6 space-y-3">
    {uncertain && <p className="text-sm text-neutral-600">Há uma tentativa aguardando verificação. Vamos consultar essa tentativa antes de criar outra reserva.</p>}
    <Button type="button" disabled={busy || status === 'loading' || (!open && !uncertain)} onClick={() => { void reserve() }} className="h-14 w-full rounded-full bg-[#ED1C24] px-6 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]">{busy ? 'Reservando…' : uncertain ? 'Verificar minha tentativa' : 'Reservar ingressos'}</Button>
    {status === 'authenticated' && <RealtimeStatus />}
  </div>
}
