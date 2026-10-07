import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { EVENT_GENRES, eventsApi, notifyEventsChanged, type EventGenre, type EventRecord } from '@/api/events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { localDateInput, parsePrice, priceInput } from '@/lib/events'
import { notify } from '@/lib/notify'
import { MarkdownContent } from './MarkdownContent'

const fieldClass = 'mt-2 h-12 rounded-xl border-black/15 bg-white'
function initialFields(event?: EventRecord) {
  const start = Date.now() + 24 * 60 * 60 * 1000
  return { title: event?.title ?? '', genre: event?.genre ?? 'football' as EventGenre, location: event?.location ?? '', content: event?.content ?? '', price: event ? priceInput(event.unitPriceCents) : '', capacity: String(event?.capacity ?? 100), startsAt: localDateInput(event?.startsAt ?? start), endsAt: localDateInput(event?.endsAt ?? start + 2 * 60 * 60 * 1000), expiresAt: localDateInput(event?.expiresAt ?? start - 60 * 60 * 1000) }
}
type Fields = ReturnType<typeof initialFields>
type Field = keyof Fields | 'banner'
type Errors = Partial<Record<Field, string>>
const dateFields = ['startsAt', 'endsAt', 'expiresAt'] as const

function validate(fields: Fields, event: EventRecord | undefined, creating: boolean, file: File | null, bannerError?: string): Errors {
  const errors: Errors = {}
  for (const [key, label, max] of [['title', 'título', 160], ['location', 'local', 200]] as const) {
    const value = fields[key].trim()
    if (!value) errors[key] = `Informe o ${label}.`
    else if (value.length < 2 || value.length > max) errors[key] = `O ${label} deve ter entre 2 e ${max} caracteres.`
  }
  if (!Object.hasOwn(EVENT_GENRES, fields.genre)) errors.genre = 'Escolha uma categoria válida.'
  if (!fields.price.trim()) errors.price = 'Informe o preço unitário. Use 0 para um evento gratuito.'
  else { try { parsePrice(fields.price) } catch (error) { errors.price = error instanceof Error ? error.message : 'Informe um preço válido.' } }
  const capacity = Number(fields.capacity)
  if (!/^\d+$/.test(fields.capacity) || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 1_000_000) errors.capacity = 'Informe um número inteiro de 1 a 1.000.000 de ingressos.'
  else if (event && capacity < event.reservedCount) errors.capacity = `O total não pode ser menor que os ${event.reservedCount} ingressos já ocupados.`
  const timestamps = Object.fromEntries(dateFields.map((key) => [key, new Date(fields[key]).getTime()])) as Record<typeof dateFields[number], number>
  for (const key of dateFields) {
    if (!fields[key] || !Number.isSafeInteger(timestamps[key]) || timestamps[key] < 1) errors[key] = 'Informe uma data e um horário válidos.'
  }
  if (creating && !errors.startsAt && timestamps.startsAt <= Date.now()) errors.startsAt = 'Para criar o evento, o início deve estar no futuro.'
  if (!errors.startsAt && !errors.endsAt && timestamps.endsAt <= timestamps.startsAt) errors.endsAt = 'O término deve ser posterior ao início do evento.'
  if (!errors.expiresAt) {
    if (!errors.startsAt && timestamps.expiresAt > timestamps.startsAt) errors.expiresAt = 'As reservas devem encerrar até o início do evento.'
    else if (creating && timestamps.expiresAt <= Date.now()) errors.expiresAt = 'Para criar o evento, o prazo de reserva deve estar no futuro.'
  }
  if (fields.content.trim().length > 20000) errors.content = 'O conteúdo deve ter no máximo 20.000 caracteres.'
  if (bannerError) errors.banner = bannerError
  else if ((creating || event?.status === 'draft') && !file) errors.banner = 'Selecione um banner para publicar o evento.'
  return errors
}

export function EventForm({ event, onSaved, onCancel }: { event?: EventRecord; onSaved: () => void; onCancel: () => void }) {
  const id = useId()
  const savingRef = useRef(false)
  const [fields, setFields] = useState(() => initialFields(event))
  const [eventId, setEventId] = useState(event?.id)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  const [bannerError, setBannerError] = useState<string>()
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const bannerRequired = !eventId || event?.status === 'draft'
  const errors = validate(fields, event, !eventId, file, bannerError)
  const visibleError = (key: Field) => (submitted || touched[key]) ? errors[key] : undefined
  const touch = (key: Field) => setTouched((current) => ({ ...current, [key]: true }))
  const attributes = (key: Field) => ({
    id: `${id}-${key}`, name: key, onBlur: () => touch(key),
    'aria-invalid': Boolean(visibleError(key)),
    'aria-describedby': [visibleError(key) ? `${id}-${key}-error` : '', ['price', 'capacity', 'content', 'banner'].includes(key) ? `${id}-${key}-hint` : '', dateFields.some((date) => date === key) ? `${id}-dates-hint` : ''].filter(Boolean).join(' ') || undefined,
  })
  const fieldLabel = (key: Field, title: string, required = true) => <label htmlFor={`${id}-${key}`} className="text-sm font-semibold">{title}{required ? <span aria-hidden="true" className="ml-1 text-[#ED1C24]">*</span> : <span className="ml-1 text-xs font-normal text-neutral-500">(opcional)</span>}</label>
  const errorMessage = (key: Field) => visibleError(key) && <p id={`${id}-${key}-error`} className="mt-2 text-xs font-medium text-[#ED1C24]">{visibleError(key)}</p>
  const inputClass = (key: Field) => `${fieldClass} ${visibleError(key) ? 'border-[#ED1C24] focus-visible:ring-[#ED1C24]' : ''}`
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // An asynchronous callback keeps derived preview state outside effect setup.
    const timer = window.setTimeout(() => setPreview(url), 0)
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url) }
  }, [file])
  function selectFile(selected?: File) {
    if (!selected) return
    touch('banner')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { setBannerError('Escolha um banner JPG, PNG ou WebP.'); return }
    if (!selected.size) { setBannerError('A imagem está vazia. Escolha outro arquivo.'); return }
    if (selected.size > 25 * 1024 * 1024) { setBannerError('O banner deve ter no máximo 25 MB.'); return }
    setBannerError(undefined)
    setFile(selected)
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (savingRef.current) return
    setFailure(undefined)
    setSubmitted(true)
    const currentErrors = validate(fields, event, !eventId, file, bannerError)
    const firstInvalid = Object.keys(currentErrors)[0]
    if (firstInvalid) {
      const control = e.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    let metadataSaved = false
    savingRef.current = true
    setBusy(true)
    try {
      const capacity = Number(fields.capacity)
      const input = { title: fields.title.trim(), genre: fields.genre, location: fields.location.trim(), content: fields.content.trim(), unitPriceCents: parsePrice(fields.price), capacity, startsAt: new Date(fields.startsAt).getTime(), endsAt: new Date(fields.endsAt).getTime(), expiresAt: new Date(fields.expiresAt).getTime() }
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
    } finally { savingRef.current = false; setBusy(false) }
  }
  const set = <Key extends keyof typeof fields>(key: Key, value: typeof fields[Key]) => setFields((current) => ({ ...current, [key]: value }))
  return <form noValidate onSubmit={(e) => { void save(e) }} className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
    <p className="mb-6 text-xs text-neutral-500">Campos com <span className="font-bold text-[#ED1C24]">*</span> são obrigatórios.</p>
    <fieldset disabled={busy} className="grid min-w-0 gap-5 disabled:opacity-70 sm:grid-cols-2">
      <div className="min-w-0 sm:col-span-2">{fieldLabel('title', 'Título')}<Input {...attributes('title')} value={fields.title} onChange={(e) => set('title', e.target.value)} required minLength={2} maxLength={160} className={inputClass('title')} />{errorMessage('title')}</div>
      <div>{fieldLabel('genre', 'Categoria')}<select {...attributes('genre')} required value={fields.genre} onChange={(e) => set('genre', e.target.value as EventGenre)} className={`${inputClass('genre')} block w-full border px-3`}>{Object.entries(EVENT_GENRES).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select>{errorMessage('genre')}</div>
      <div>{fieldLabel('location', 'Local')}<Input {...attributes('location')} value={fields.location} onChange={(e) => set('location', e.target.value)} required minLength={2} maxLength={200} className={inputClass('location')} />{errorMessage('location')}</div>
      <div>{fieldLabel('price', 'Preço unitário (R$)')}<Input {...attributes('price')} inputMode="decimal" value={fields.price} onChange={(e) => set('price', e.target.value)} required placeholder="34,50" className={inputClass('price')} /><p id={`${id}-price-hint`} className="mt-2 text-xs text-neutral-500">Use 10 ou 34,50. Para eventos gratuitos, informe 0.</p>{errorMessage('price')}</div>
      <div>{fieldLabel('capacity', 'Total de ingressos')}<Input {...attributes('capacity')} type="number" min={event?.reservedCount || 1} max={1000000} step={1} value={fields.capacity} onChange={(e) => set('capacity', e.target.value)} required className={inputClass('capacity')} /><p id={`${id}-capacity-hint`} className="mt-2 text-xs text-neutral-500">De 1 a 1.000.000 de ingressos.{event && event.reservedCount > 0 ? ` Já ocupados: ${event.reservedCount}.` : ''}</p>{errorMessage('capacity')}</div>
      <div className="min-w-0">{fieldLabel('startsAt', 'Início')}<Input {...attributes('startsAt')} type="datetime-local" value={fields.startsAt} onChange={(e) => set('startsAt', e.target.value)} required className={inputClass('startsAt')} />{errorMessage('startsAt')}</div>
      <div className="min-w-0">{fieldLabel('endsAt', 'Término')}<Input {...attributes('endsAt')} type="datetime-local" min={fields.startsAt || undefined} value={fields.endsAt} onChange={(e) => set('endsAt', e.target.value)} required className={inputClass('endsAt')} />{errorMessage('endsAt')}</div>
      <div className="min-w-0">{fieldLabel('expiresAt', 'Reservas até')}<Input {...attributes('expiresAt')} type="datetime-local" max={fields.startsAt || undefined} value={fields.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} required className={inputClass('expiresAt')} />{errorMessage('expiresAt')}</div>
      <p id={`${id}-dates-hint`} className="self-center text-xs text-neutral-500">Preencha as datas no seu horário local. O término deve ser posterior ao início e as reservas devem encerrar até o início.{!eventId ? ' O prazo de reserva deve estar no futuro.' : ''}</p>
      <div className="sm:col-span-2">{fieldLabel('content', 'Conteúdo', false)}<textarea {...attributes('content')} value={fields.content} onChange={(e) => set('content', e.target.value)} maxLength={20000} rows={8} placeholder="## Sobre o evento&#10;&#10;**Desconto e prioridade**&#10;- 50% de desconto na arquibancada" className={`mt-2 block w-full resize-y rounded-xl border bg-white p-4 font-normal focus-visible:outline-[#ED1C24] ${visibleError('content') ? 'border-[#ED1C24]' : 'border-black/15'}`} /><p id={`${id}-content-hint`} className="mt-2 text-xs text-neutral-500">Aceita Markdown: títulos, negrito, listas, links e tabelas. Não aparece nos cards da home. Até 20.000 caracteres.</p>{errorMessage('content')}</div>
      {fields.content.trim() && <section aria-label="Prévia do conteúdo" className="min-w-0 rounded-xl border border-black/10 bg-[#faf8f7] p-5 sm:col-span-2"><h3 className="mb-4 text-xs font-bold tracking-widest text-[#ED1C24] uppercase">Prévia do conteúdo</h3><MarkdownContent content={fields.content} /></section>}
      <div className="sm:col-span-2">{fieldLabel('banner', 'Banner', bannerRequired)}<Input {...attributes('banner')} type="file" required={bannerRequired && !file} accept="image/jpeg,image/png,image/webp" onChange={(e) => { selectFile(e.target.files?.[0]); e.target.value = '' }} className={`${inputClass('banner')} h-auto py-3`} /><p id={`${id}-banner-hint`} className="mt-2 text-xs text-neutral-500">JPG, PNG ou WebP. Até 25 MB e 100 megapixels.{!bannerRequired ? ' A imagem atual será mantida se você não escolher outra.' : ''}{file ? ` Selecionado: ${file.name}.` : ''}</p>{errorMessage('banner')}</div>
      {(preview || event?.bannerUrl) && <img src={preview ?? event?.bannerUrl ?? undefined} alt="Prévia do banner" className="max-h-72 w-full rounded-xl object-contain sm:col-span-2" />}
    </fieldset>
    {submitted && Object.keys(errors).length > 0 && <p role="alert" className="mt-5 text-sm font-medium text-[#ED1C24]">Revise {Object.keys(errors).length === 1 ? 'o campo destacado' : `os ${Object.keys(errors).length} campos destacados`} antes de salvar.</p>}
    {failure && <p role="alert" className="mt-5 whitespace-pre-line text-sm text-[#ED1C24]">{failure}</p>}
    <div className="mt-6 flex flex-wrap gap-3"><Button type="submit" disabled={busy} className="h-12 rounded-full bg-[#ED1C24] px-6 font-bold text-white hover:bg-[#d0161d]">{busy ? 'Salvando…' : 'Salvar evento'}</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="h-12 rounded-full">Cancelar</Button></div>
  </form>
}
