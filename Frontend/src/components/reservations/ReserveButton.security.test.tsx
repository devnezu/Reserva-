import { afterEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '@/context/AuthProvider'
import { ReserveButton } from './ReserveButton'
import type { EventRecord } from '@/api/events'

afterEach(() => vi.unstubAllGlobals())
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
test('429 while recovering an uncertain reservation keeps its idempotency key', async () => {
  const at = Date.now(), headers: HeadersInit[] = []
  const event: EventRecord = { id: 3, slug: 'test', title: 'Test', genre: 'pop', location: 'Venue', unitPriceCents: 1000, capacity: 2, available: 2, reservedCount: 0, startsAt: at + 86400000, endsAt: at + 93600000, expiresAt: at + 82800000, bannerUrl: null, status: 'open' }
  vi.stubGlobal('fetch', vi.fn(async (path: RequestInfo | URL, options: RequestInit = {}) => {
    if (path === '/api/auth/me') return json(200, { user: { id: 1, name: 'Rafael', email: 'dry1@reservai.com', avatarUrl: null, role: 'user' }, expiresAt: at + 3600000 })
    headers.push(options.headers ?? {})
    if (headers.length === 1) throw new TypeError('Lost HTTP response')
    if (headers.length === 2) return json(429, { code: 'RATE_LIMITED', message: 'Aguarde' })
    return json(200, { serverTime: at, reservation: { id: 'same-reservation', status: 'PENDENTE' } })
  }))
  render(<MemoryRouter><AuthProvider><Routes><Route path="/" element={<ReserveButton event={event} quantity={1} open onRefresh={() => {}} />} /><Route path="/reservas/:id" element={<p>Reserva recuperada</p>} /></Routes></AuthProvider></MemoryRouter>)
  const user = userEvent.setup()
  await screen.findByRole('button', { name: 'Reservar ingressos' })
  await waitFor(() => expect((screen.getByRole('button', { name: 'Reservar ingressos' }) as HTMLButtonElement).disabled).toBe(false))
  await user.click(screen.getByRole('button', { name: 'Reservar ingressos' }))
  await user.click(await screen.findByRole('button', { name: 'Verificar minha tentativa' }))
  await waitFor(() => expect(headers).toHaveLength(2))
  await user.click(await screen.findByRole('button', { name: 'Verificar minha tentativa' }))
  await screen.findByText('Reserva recuperada')
  expect(headers.map((value) => new Headers(value).get('Idempotency-Key'))).toEqual([expect.any(String), expect.any(String), expect.any(String)])
  expect(new Set(headers.map((value) => new Headers(value).get('Idempotency-Key'))).size).toBe(1)
})
