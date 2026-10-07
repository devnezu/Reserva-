import { useState } from 'react'
import { Link } from 'react-router'
import { eventsApi, notifyEventsChanged, type EventRecord } from '@/api/events'
import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'
import { Button } from '@/components/ui/button'
import { EventForm } from '@/components/events/EventForm'
import { EventFilters, EventPagination } from '@/components/events/EventFilters'
import { useEvents } from '@/hooks/use-events'
import { EVENT_STATUS, formatEventDate, formatPrice } from '@/lib/events'
import { notify } from '@/lib/notify'

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
  return <div className="flex min-h-svh flex-col bg-[#faf8f7] text-[#111111]">
    <div className="bg-[#ED1C24] text-white"><Navbar /></div>
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-6 py-10 sm:px-12">
      <nav aria-label="Caminho" className="text-sm text-neutral-600"><Link to="/conta" className="hover:text-[#ED1C24]">Minha conta</Link><span className="mx-3">/</span>Gerenciar eventos</nav>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-[#ED1C24] uppercase">Administração</p><h1 className="mt-2 text-3xl font-extrabold uppercase sm:text-5xl">Gerenciar eventos</h1></div><Button onClick={() => setForm({})} disabled={form !== undefined} className="h-12 rounded-full bg-[#ED1C24] px-6 text-white hover:bg-[#d0161d]">Novo evento</Button></div>
      {form && <EventForm key={form.event?.id ?? 'new'} event={form.event} onSaved={refresh} onCancel={() => setForm(undefined)} />}
      <EventFilters search={query.q} genre={query.genre} onSearch={(q) => setQuery({ ...query, q, page: 1 })} onGenre={(genre) => setQuery({ ...query, genre, page: 1 })} />
      {loading && <p role="status">Carregando eventos…</p>}
      {error && <div role="alert"><p>{error}</p><Button className="mt-3" onClick={refresh}>Tentar novamente</Button></div>}
      {data && <><p className="text-sm text-neutral-500">{data.total} evento(s), incluindo rascunhos e encerrados</p><ul className="space-y-4">{data.items.map((event) => <li key={event.id} className="flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 md:flex-row md:items-center">
        {event.bannerUrl && <img src={event.bannerUrl} alt="" className="h-28 w-full rounded-xl object-cover md:w-40" />}
        <div className="min-w-0 flex-1"><span className="text-xs font-bold text-[#ED1C24]">{EVENT_STATUS[event.status]}</span><h2 className="mt-1 text-lg font-extrabold break-words">{event.title}</h2><p className="mt-1 text-sm text-neutral-600">{formatEventDate(event.startsAt)} · {event.location}</p><p className="mt-2 text-sm font-semibold">{formatPrice(event.unitPriceCents)} · {event.available} de {event.capacity} disponíveis</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy !== undefined || form !== undefined} onClick={() => { void edit(event.id) }}>Editar</Button>{confirmId === event.id ? <><Button disabled={busy !== undefined} onClick={() => { void remove(event.id) }} className="bg-[#ED1C24] text-white hover:bg-[#d0161d]">Confirmar remoção</Button><Button variant="outline" disabled={busy !== undefined} onClick={() => setConfirmId(undefined)}>Cancelar</Button></> : <Button variant="outline" disabled={busy !== undefined || form !== undefined} onClick={() => setConfirmId(event.id)} className="text-[#ED1C24]">Remover</Button>}</div>
      </li>)}</ul>{!data.items.length && <p>Nenhum evento encontrado.</p>}<EventPagination page={query.page} pages={data.totalPages} busy={loading} onPage={(page) => setQuery({ ...query, page })} /></>}
    </main><Footer />
  </div>
}
