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
    {loading && !data && <p role="status" className="py-8 text-center text-neutral-600">Carregando reserva…</p>}
    {error && <div role="alert" className="bg-[#f0eceb] px-6 py-12 text-center"><p className="text-sm font-bold uppercase">{notFound ? 'Reserva não encontrada.' : error}</p>{!notFound && <Button onClick={refresh} className="mt-5 h-12 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase hover:bg-[#d0161d]">Tentar novamente</Button>}</div>}
    {data && <ReservationCard reservation={data.reservation} serverTime={data.serverTime} onRefresh={refresh} detail />}
  </AccountLayout>
}
