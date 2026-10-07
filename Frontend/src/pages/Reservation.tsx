import { useParams } from 'react-router'
import AccountLayout from '@/components/AccountLayout'
import { Button } from '@/components/ui/button'
import { ReservationCard } from '@/components/reservations/ReservationCard'
import { RealtimeStatus } from '@/components/reservations/RealtimeStatus'
import { useReservation } from '@/hooks/use-reservations'

export default function Reservation() {
  const { id = '' } = useParams()
  const { data, error, loading, notFound, refresh } = useReservation(id)
  return <AccountLayout active="eventos" trail="Sua reserva" title={<>Sua <span className="text-[#ED1C24]">reserva</span></>}>
    <RealtimeStatus />
    {loading && <p role="status">Carregando reserva…</p>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6"><p>{notFound ? 'Reserva não encontrada.' : error}</p>{!notFound && <Button onClick={refresh} variant="outline" className="mt-3">Tentar novamente</Button>}</div>}
    {data && <ReservationCard reservation={data.reservation} serverTime={data.serverTime} onRefresh={refresh} detail />}
  </AccountLayout>
}
