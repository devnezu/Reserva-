import { useState } from 'react'
import { useReservations } from '@/hooks/use-reservations'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'
import { Button } from '@/components/ui/button'
import { ReservationCard } from './ReservationCard'
import { RealtimeStatus } from './RealtimeStatus'
import { LoadingOverlay } from '@/components/LoadingOverlay'

export function MyReservations() {
  const [page, setPage] = useState(1)
  const { data, error, loading, refresh } = useReservations(page)
  const goToAgenda = useGoToAgenda()
  return <section aria-label="Minhas reservas" className="space-y-4">
    <RealtimeStatus />
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5"><p className="text-sm text-red-800">{error}</p><Button onClick={refresh} variant="outline" className="mt-3">Tentar novamente</Button></div>}
    {loading && !data && <LoadingOverlay label="Carregando reservas" />}
    {data?.total === 0 && <div className="rounded-3xl border border-black/10 bg-white px-6 py-12 text-center"><h2 className="text-xl font-extrabold uppercase">Você ainda não tem reservas</h2><p className="mt-3 text-sm text-neutral-600">Escolha um evento, reserve seus ingressos e confirme em até 5 minutos.</p><Button onClick={goToAgenda} className="mt-6 rounded-full bg-[#ED1C24] px-7 font-bold text-white hover:bg-[#d0161d]">Ver próximos jogos</Button></div>}
    {data?.items.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} serverTime={data.serverTime} onRefresh={refresh} />)}
    {!!data?.total && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>{data.total} reserva(s) · Página {data.page} de {data.totalPages}</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Button variant="outline" disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div></div>}
  </section>
}
