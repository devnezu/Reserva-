import type { EventRecord } from '@/api/events'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
export const formatPrice = (cents: number) => currency.format(cents / 100)
export const formatEventDate = (timestamp: number) => date.format(timestamp)
export const eventPath = (event: EventRecord) => `/eventos/${event.slug}`
export const EVENT_STATUS = { draft: 'Rascunho', open: 'Disponível', sold_out: 'Esgotado', expired: 'Encerrado' } as const
export const isEventOpen = (event: EventRecord) => event.status === 'open' && event.expiresAt > Date.now() && event.startsAt > Date.now()
export function parsePrice(value: string) {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim())
  if (!match) throw new Error('Informe o preço como 10, 20 ou 34,50.')
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > 100_000_000) throw new Error('O preço máximo é R$ 1.000.000,00.')
  return cents
}
export function priceInput(cents: number) { return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}` }
export function localDateInput(timestamp: number) {
  const value = new Date(timestamp)
  return new Date(timestamp - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
