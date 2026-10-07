import { useEffect, useState, type FormEvent } from 'react'
import { EVENT_GENRES, eventsApi, notifyEventsChanged, type EventGenre, type EventRecord } from '@/api/events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { localDateInput, parsePrice, priceInput } from '@/lib/events'
import { notify } from '@/lib/notify'

const fieldClass = 'mt-2 h-12 rounded-xl border-black/15 bg-white'
function initialFields(event?: EventRecord) {
  const start = Date.now() + 24 * 60 * 60 * 1000
  return { title: event?.title ?? '', genre: event?.genre ?? 'football' as EventGenre, location: event?.location ?? '', content: event?.content ?? '', price: event ? priceInput(event.unitPriceCents) : '', capacity: String(event?.capacity ?? 100), startsAt: localDateInput(event?.startsAt ?? start), endsAt: localDateInput(event?.endsAt ?? start + 2 * 60 * 60 * 1000), expiresAt: localDateInput(event?.expiresAt ?? start - 60 * 60 * 1000) }
}
export function EventForm({ event, onSaved, onCancel }: { event?: EventRecord; onSaved: () => void; onCancel: () => void }) {
  const [fields, setFields] = useState(() => initialFields(event))
  const [eventId, setEventId] = useState(event?.id)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // An asynchronous callback keeps derived preview state outside effect setup.
    const timer = window.setTimeout(() => setPreview(url), 0)
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url) }
  }, [file])
  function selectFile(selected?: File) {
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { notify.error('Escolha um banner JPG, PNG ou WebP.'); return }
    if (selected.size > 25 * 1024 * 1024) { notify.error('O banner deve ter no máximo 25 MB.'); return }
    setFile(selected)
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFailure(undefined)
    if ((!eventId || event?.status === 'draft') && !file) { setFailure('Selecione o banner para publicar o evento.'); return }
    let metadataSaved = false
    setBusy(true)
    try {
      const capacity = Number(fields.capacity)
      if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 1_000_000) throw new Error('Informe uma capacidade entre 1 e 1.000.000 de ingressos.')
      const input = { title: fields.title, genre: fields.genre, location: fields.location, content: fields.content, unitPriceCents: parsePrice(fields.price), capacity, startsAt: new Date(fields.startsAt).getTime(), endsAt: new Date(fields.endsAt).getTime(), expiresAt: new Date(fields.expiresAt).getTime() }
      if (![input.startsAt, input.endsAt, input.expiresAt].every(Number.isFinite)) throw new Error('Preencha as três datas.')
      const saved = eventId ? await eventsApi.update(eventId, input) : await eventsApi.create(input)
      setEventId(saved.event.id)
      metadataSaved = true
      if (file) await eventsApi.uploadBanner(saved.event.id, file)
      notify.success(event ? 'Evento atualizado.' : 'Evento publicado.')
      notifyEventsChanged()
      onSaved()
      onCancel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o evento.'
      const text = metadataSaved ? `Os dados foram salvos, mas o banner falhou. Tente salvar novamente. ${message}` : message
      setFailure(text)
      notify.error('Não foi possível concluir.', text)
      if (metadataSaved) { notifyEventsChanged(); onSaved() }
    } finally { setBusy(false) }
  }
  const set = <Key extends keyof typeof fields>(key: Key, value: typeof fields[Key]) => setFields((current) => ({ ...current, [key]: value }))
  return <form onSubmit={(e) => { void save(e) }} className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
    <h2 className="text-2xl font-extrabold uppercase">{event ? 'Editar evento' : 'Novo evento'}</h2>
    <fieldset disabled={busy} className="mt-6 grid min-w-0 gap-5 disabled:opacity-70 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-semibold sm:col-span-2">Título<Input value={fields.title} onChange={(e) => set('title', e.target.value)} required minLength={2} maxLength={160} className={fieldClass} /></label>
      <label className="text-sm font-semibold">Categoria<select value={fields.genre} onChange={(e) => set('genre', e.target.value as EventGenre)} className={`${fieldClass} block w-full border px-3`}>{Object.entries(EVENT_GENRES).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
      <label className="text-sm font-semibold">Local<Input value={fields.location} onChange={(e) => set('location', e.target.value)} required minLength={2} maxLength={200} className={fieldClass} /></label>
      <label className="text-sm font-semibold">Preço unitário (R$)<Input inputMode="decimal" value={fields.price} onChange={(e) => set('price', e.target.value)} required placeholder="34,50" className={fieldClass} /></label>
      <label className="text-sm font-semibold">Total de ingressos<Input type="number" min={event?.reservedCount || 1} max={1000000} step={1} value={fields.capacity} onChange={(e) => set('capacity', e.target.value)} required className={fieldClass} /></label>
      <label className="min-w-0 text-sm font-semibold">Início<Input type="datetime-local" value={fields.startsAt} onChange={(e) => set('startsAt', e.target.value)} required className={fieldClass} /></label>
      <label className="min-w-0 text-sm font-semibold">Término<Input type="datetime-local" value={fields.endsAt} onChange={(e) => set('endsAt', e.target.value)} required className={fieldClass} /></label>
      <label className="min-w-0 text-sm font-semibold">Reservas até<Input type="datetime-local" value={fields.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} required className={fieldClass} /></label>
      <p className="self-center text-xs text-neutral-500">Preencha as datas no seu horário local. O prazo de reserva deve ser anterior ou igual ao início.</p>
      <label className="text-sm font-semibold sm:col-span-2">Conteúdo<textarea value={fields.content} onChange={(e) => set('content', e.target.value)} maxLength={20000} rows={8} placeholder="Descreva o evento, benefícios e informações…" className="mt-2 block w-full resize-y rounded-xl border border-black/15 bg-white p-4 font-normal focus-visible:outline-[#ED1C24]" /><span className="mt-2 block text-xs font-normal text-neutral-500">Descrição da página do evento. Não aparece nos cards da home.</span></label>
      <label className="text-sm font-semibold sm:col-span-2">Banner<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { selectFile(e.target.files?.[0]); e.target.value = '' }} className={`${fieldClass} h-auto py-3`} /><span className="mt-2 block text-xs font-normal text-neutral-500">JPG, PNG ou WebP. Até 25 MB e 100 megapixels.</span></label>
      {(preview || event?.bannerUrl) && <img src={preview ?? event?.bannerUrl ?? undefined} alt="Prévia do banner" className="max-h-72 w-full rounded-xl object-contain sm:col-span-2" />}
    </fieldset>
    {failure && <p role="alert" className="mt-5 whitespace-pre-line text-sm text-[#ED1C24]">{failure}</p>}
    <div className="mt-6 flex flex-wrap gap-3"><Button type="submit" disabled={busy} className="h-12 rounded-full bg-[#ED1C24] px-6 font-bold text-white hover:bg-[#d0161d]">{busy ? 'Salvando…' : 'Salvar evento'}</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="h-12 rounded-full">Cancelar</Button></div>
  </form>
}
