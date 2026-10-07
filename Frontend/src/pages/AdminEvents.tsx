import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { eventsApi, notifyEventsChanged, type EventRecord } from '@/api/events'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon } from '@hugeicons/core-free-icons'
import AccountLayout from '@/components/AccountLayout'
import { Button } from '@/components/ui/button'
import { EventForm } from '@/components/events/EventForm'
import { EventFilters, EventPagination } from '@/components/events/EventFilters'
import { useEvents } from '@/hooks/use-events'
import { EVENT_STATUS, formatEventDate, formatPrice } from '@/lib/events'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { LoadingOverlay } from '@/components/LoadingOverlay'

const LIST_PATH = '/admin/eventos'
const NEW_PATH = `${LIST_PATH}/novo`
const ACTION_CLASS = 'h-10 rounded-full border-black/15 bg-transparent px-5 text-xs font-bold tracking-wide uppercase shadow-none'

// /admin/eventos lista; /admin/eventos/novo cria; /admin/eventos/:id edita aquele evento.
export default function AdminEvents() {
  const { id } = useParams()
  const navigate = useNavigate()
  const creating = id === 'novo'
  const editingId = id !== undefined && !creating ? Number(id) : undefined
  const validEditingId = editingId !== undefined && Number.isSafeInteger(editingId) && editingId > 0 ? editingId : undefined
  const [query, setQuery] = useState({ page: 1, q: '', genre: '' })
  const { data, loading, error, refresh } = useEvents({ ...query, manage: true, pageSize: 8 })
  const [loaded, setLoaded] = useState<{ id: number; event?: EventRecord; error?: string }>()
  const [busy, setBusy] = useState<number>()
  const [confirmId, setConfirmId] = useState<number>()
  const backToList = () => { void navigate(LIST_PATH) }

  useEffect(() => {
    if (validEditingId === undefined) return
    const controller = new AbortController()
    eventsApi.get(validEditingId, controller.signal).then(
      ({ event }) => { if (!controller.signal.aborted) setLoaded({ id: validEditingId, event }) },
      (reason: unknown) => { if (!controller.signal.aborted) setLoaded({ id: validEditingId, error: reason instanceof Error ? reason.message : 'Não foi possível abrir o evento.' }) },
    )
    return () => controller.abort()
  }, [validEditingId])

  async function remove(eventId: number) {
    setBusy(eventId)
    try { await eventsApi.remove(eventId); notify.success('Evento removido da agenda.'); notifyEventsChanged(); if (query.page > 1 && data?.items.length === 1) setQuery({ ...query, page: query.page - 1 }); else refresh() }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Não foi possível remover o evento.') }
    finally { setBusy(undefined); setConfirmId(undefined) }
  }

  if (creating || editingId !== undefined) {
    const current = loaded?.id === validEditingId ? loaded : undefined
    const failure = !creating && validEditingId === undefined ? 'Evento não encontrado.' : current?.error
    return (
      <AccountLayout active="admin" trail={creating ? 'Novo evento' : 'Editar evento'} title={<>{creating ? 'Novo' : 'Editar'} <span className="text-[#ED1C24]">evento</span></>}>
        {creating && <EventForm key="new" onSaved={refresh} onCancel={backToList} />}
        {!creating && current?.event && <EventForm key={current.event.id} event={current.event} onSaved={refresh} onCancel={backToList} />}
        {!creating && !failure && !current?.event && <LoadingOverlay label="Carregando evento" />}
        {failure && <div role="alert" className="bg-[#f0eceb] px-6 py-12 text-center"><p className="text-sm font-bold uppercase">{failure}</p><Button asChild className="mt-5 h-12 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase hover:bg-[#d0161d]"><Link to={LIST_PATH}>Voltar para eventos</Link></Button></div>}
      </AccountLayout>
    )
  }

  return (
    <AccountLayout active="admin" title={<>Eventos <span className="text-[#ED1C24]">cadastrados</span></>} action={<Button asChild className="h-12 gap-3 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]"><Link to={NEW_PATH}><HugeiconsIcon icon={Add01Icon} size={18} />Novo evento</Link></Button>}>
      <EventFilters categories="select" search={query.q} genre={query.genre} onSearch={(q) => setQuery({ ...query, q, page: 1 })} onGenre={(genre) => setQuery({ ...query, genre, page: 1 })} />
      {loading && !data && <LoadingOverlay label="Carregando eventos" />}
      {error && <div role="alert" className="py-8 text-center"><p>{error}</p><Button className="mt-4 rounded-full" onClick={refresh}>Tentar novamente</Button></div>}
      {data && <>
        <ul className="space-y-4">{data.items.map((event) => <li key={event.id} className="flex flex-col gap-5 overflow-hidden rounded-3xl border border-black/10 bg-white p-5 md:flex-row md:items-center">
          {event.bannerUrl && <img src={event.bannerUrl} alt="" className="h-32 w-full rounded-2xl object-cover md:h-24 md:w-36" />}
          <div className="min-w-0 flex-1">
            {event.status !== 'open' && <span className="mb-2 inline-flex rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-neutral-700 uppercase">{EVENT_STATUS[event.status]}</span>}
            <h2 className="text-lg leading-tight font-extrabold break-words uppercase">{event.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{formatEventDate(event.startsAt)} · {event.location}</p>
            <p className="mt-2 text-sm font-bold">{formatPrice(event.unitPriceCents)} · {event.available} de {event.capacity} disponíveis</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className={ACTION_CLASS}><Link to={`${LIST_PATH}/${event.id}`}>Editar</Link></Button>
            {confirmId === event.id
              ? <><Button disabled={busy !== undefined} onClick={() => { void remove(event.id) }} className={cn(ACTION_CLASS, 'border-transparent bg-[#ED1C24] text-white hover:bg-[#d0161d]')}>Confirmar remoção</Button><Button variant="outline" disabled={busy !== undefined} onClick={() => setConfirmId(undefined)} className={ACTION_CLASS}>Cancelar</Button></>
              : <Button variant="outline" disabled={busy !== undefined} onClick={() => setConfirmId(event.id)} className={cn(ACTION_CLASS, 'text-[#ED1C24] hover:bg-[#ED1C24]/10 hover:text-[#ED1C24]')}>Remover</Button>}
          </div>
        </li>)}</ul>
        {!data.items.length && <p className="bg-[#f0eceb] px-6 py-12 text-center text-sm font-bold uppercase">Nenhum evento encontrado</p>}
        <EventPagination page={query.page} pages={data.totalPages} busy={loading} onPage={(page) => setQuery({ ...query, page })} />
      </>}
    </AccountLayout>
  )
}
