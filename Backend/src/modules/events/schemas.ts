import { HttpError } from '../../middlewares/error-handler.js'

export const genres = ['football', 'sport', 'pop', 'music', 'other'] as const
export type EventGenre = typeof genres[number]
export interface EventInput { title: string; genre: EventGenre; location: string; content: string; unitPriceCents: number; capacity: number; startsAt: number; endsAt: number; expiresAt: number }
export function parseEvent(body: unknown): EventInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Dados do evento inválidos.')
  const value = body as Record<string, unknown>
  const text = (key: string, min: number, max: number) => {
    const result = typeof value[key] === 'string' ? value[key].trim() : ''
    if (result.length < min || result.length > max) throw new HttpError(400, `O campo ${key} deve ter entre ${min} e ${max} caracteres.`)
    return result
  }
  const integer = (key: string, min: number, max: number) => {
    const result = value[key]
    if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < min || result > max) throw new HttpError(400, `O campo ${key} deve ser um número inteiro entre ${min} e ${max}.`)
    return result
  }
  if (!genres.includes(value.genre as EventGenre)) throw new HttpError(400, 'Escolha uma categoria válida.')
  if (value.content !== undefined && typeof value.content !== 'string') throw new HttpError(400, 'O conteúdo deve ser um texto.')
  const event = {
    title: text('title', 2, 160), genre: value.genre as EventGenre, location: text('location', 2, 200),
    content: value.content === undefined ? '' : text('content', 0, 20000),
    unitPriceCents: integer('unitPriceCents', 0, 100_000_000), capacity: integer('capacity', 1, 1_000_000),
    startsAt: integer('startsAt', 1, 8_640_000_000_000_000), endsAt: integer('endsAt', 1, 8_640_000_000_000_000), expiresAt: integer('expiresAt', 1, 8_640_000_000_000_000),
  }
  if (event.endsAt <= event.startsAt) throw new HttpError(400, 'O término deve ser posterior ao início do evento.')
  if (event.expiresAt > event.startsAt) throw new HttpError(400, 'O prazo de reserva deve terminar até o início do evento.')
  return event
}
export function parseId(raw: string) {
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new HttpError(400, 'Identificador inválido.')
  return Number(raw)
}
export function parseQuery(url: URL) {
  const number = (key: string, fallback: number, max: number) => {
    const raw = url.searchParams.get(key)
    if (raw === null) return fallback
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max) throw new HttpError(400, 'Paginação inválida.')
    return Number(raw)
  }
  const q = (url.searchParams.get('q') ?? '').trim()
  const genre = url.searchParams.get('genre') ?? ''
  if (q.length > 160 || (genre && !genres.includes(genre as EventGenre))) throw new HttpError(400, 'Filtro inválido.')
  return { page: number('page', 1, 1_000_000), pageSize: number('pageSize', 6, 50), q, genre }
}
