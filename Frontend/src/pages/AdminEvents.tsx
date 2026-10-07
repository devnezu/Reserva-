import { useState } from 'react'
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

const ACTION_CLASS = 'h-10 rounded-full border-black/15 bg-transparent px-5 text-xs font-bold tracking-wide uppercase shadow-none'

export default function AdminEvents() {
  const [query, setQuery] = useState({ page: 1, q: '', genre: '' })
  const { data, loading, error, refresh } = useEvents({ ...query, manage: true, pageSize: 8 })
  const [form, setForm] = useState<{ event?: EventRecord }>()
  const [busy, setBusy] = useState<number>()
  const [confirmId, setConfirmId] = useState<number>()
  async function edit(id: number) {
    setBusy(id)
    try { setForm({ event: (await eventsApi.get(id)).event }); window.scrollTo({ top: 0, behavior: 'instant' }) }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Não foi possível abrir o evento.') }
    finally { setBusy(undefined) }
  }
  async function remove(id: number) {
    setBusy(id)
    try { await eventsApi.remove(id); notify.success('Evento removido da agenda.'); notifyEventsChanged(); if (query.page > 1 && data?.items.length === 1) setQuery({ ...query, page: query.page - 1 }); else refresh() }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Não foi possível remover o evento.') }
    finally { setBusy(undefined); setConfirmId(undefined) }
  }
  return (
    <AccountLayout active="admin">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Gerenciar <span className="text-[#ED1C24]">eventos</span></h1>
        <Button onClick={() => setForm({})} disabled={form !== undefined} className="h-12 gap-3 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]"><HugeiconsIcon icon={Add01Icon} size={18} />Novo evento</Button>
      </div>
      {form && <EventForm key={form.event?.id ?? 'new'} event={form.event} onSaved={refresh} onCancel={() => setForm(undefined)} />}
      <EventFilters categories="select" search={query.q} genre={query.genre} onSearch={(q) => setQuery({ ...query, q, page: 1 })} onGenre={(genre) => setQuery({ ...query, genre, page: 1 })} />
      {loading && !data && <p role="status" className="py-8 text-center text-neutral-600">Carregando eventos…</p>}
      {error && <div role="alert" className="py-8 text-center"><p>{error}</p><Button className="mt-4 rounded-full" onClick={refresh}>Tentar novamente</Button></div>}
      {data && <>
        <ul className="space-y-4">{data.items.map((event) => <li key={event.id} className="flex flex-col gap-5 overflow-hidden rounded-3xl border border-black/10 bg-white p-5 md:flex-row md:items-center">
          {event.bannerUrl && <img src={event.bannerUrl} alt="" className="h-32 w-full rounded-2xl object-cover md:h-24 md:w-36" />}
          <div className="min-w-0 flex-1">
            <span className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase', event.status === 'open' ? 'bg-[#ED1C24]/10 text-[#ED1C24]' : 'bg-black/5 text-neutral-700')}>{EVENT_STATUS[event.status]}</span>
            <h2 className="mt-2 text-lg leading-tight font-extrabold break-words uppercase">{event.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{formatEventDate(event.startsAt)} · {event.location}</p>
            <p className="mt-2 text-sm font-bold">{formatPrice(event.unitPriceCents)} · {event.available} de {event.capacity} disponíveis</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy !== undefined || form !== undefined} onClick={() => { void edit(event.id) }} className={ACTION_CLASS}>Editar</Button>
            {confirmId === event.id
              ? <><Button disabled={busy !== undefined} onClick={() => { void remove(event.id) }} className={cn(ACTION_CLASS, 'border-transparent bg-[#ED1C24] text-white hover:bg-[#d0161d]')}>Confirmar remoção</Button><Button variant="outline" disabled={busy !== undefined} onClick={() => setConfirmId(undefined)} className={ACTION_CLASS}>Cancelar</Button></>
              : <Button variant="outline" disabled={busy !== undefined || form !== undefined} onClick={() => setConfirmId(event.id)} className={cn(ACTION_CLASS, 'text-[#ED1C24] hover:bg-[#ED1C24]/10 hover:text-[#ED1C24]')}>Remover</Button>}
          </div>
        </li>)}</ul>
        {!data.items.length && <p className="bg-[#f0eceb] px-6 py-12 text-center text-sm font-bold uppercase">Nenhum evento encontrado</p>}
        <EventPagination page={query.page} pages={data.totalPages} busy={loading} onPage={(page) => setQuery({ ...query, page })} />
      </>}
    </AccountLayout>
  )
}
