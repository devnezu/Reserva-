import { afterEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '@/context/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import type { EventRecord } from '@/api/events'
import Event from './Event'

const CONFLICT_MESSAGE = 'Não há ingressos suficientes para essa quantidade. Outra pessoa pode ter reservado os últimos ingressos.'
const future = Date.now() + 7 * 24 * 60 * 60 * 1000
const baseEvent: EventRecord = {
  id: 3, slug: 'noite-pop', title: 'Noite Pop', genre: 'pop', location: 'Espaço Reservaí, São Paulo', unitPriceCents: 1000,
  capacity: 2, reservedCount: 0, available: 2, startsAt: future, endsAt: future + 2 * 60 * 60 * 1000, expiresAt: future - 60 * 60 * 1000,
  bannerUrl: null, status: 'open', content: 'Evento de teste.',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

// Cenário 6 do desafio: a API responde 409 ao reservar. A tela precisa avisar com uma mensagem
// compreensível, encerrar o carregamento e mostrar a disponibilidade atualizada, sem recarregar.
test('409 ao reservar: mostra a mensagem, encerra o carregamento e atualiza a disponibilidade', async () => {
  let soldOut = false
  let answerReservation!: (response: Response) => void
  const reservationRequests: RequestInit[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const path = String(input)
    if (path === '/api/auth/me') return json(200, { user: { id: 1, name: 'Rafael', email: 'dry1@reservai.com', avatarUrl: null, role: 'user' }, expiresAt: Date.now() + 60 * 60 * 1000 })
    if (path === '/api/events/public/noite-pop') return json(200, { event: soldOut ? { ...baseEvent, reservedCount: 2, available: 0, status: 'sold_out' } : baseEvent })
    if (path === '/api/reservations' && init.method === 'POST') {
      reservationRequests.push(init)
      return new Promise<Response>((resolve) => { answerReservation = resolve })
    }
    return json(404, { message: 'Rota não simulada.', code: 'NOT_MOCKED' })
  })
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={['/eventos/noite-pop']}>
      <AuthProvider>
        <Routes><Route path="/eventos/:id" element={<Event />} /></Routes>
        <Toaster />
      </AuthProvider>
    </MemoryRouter>,
  )

  expect(await screen.findByText('2 de 2 ingressos disponíveis')).toBeTruthy()
  const reserve = await screen.findByRole('button', { name: 'Reservar ingressos' })
  await waitFor(() => expect((reserve as HTMLButtonElement).disabled).toBe(false))

  await user.click(reserve)
  const loading = await screen.findByRole('button', { name: 'Reservando…' })
  expect((loading as HTMLButtonElement).disabled).toBe(true)
  // Um segundo clique durante o envio não pode gerar outra requisição.
  await user.click(loading)
  expect(reservationRequests).toHaveLength(1)
  expect(JSON.parse(String(reservationRequests[0].body))).toEqual({ eventId: 3, quantity: 1 })

  // Outra pessoa levou os últimos ingressos: o servidor recusa e o saldo passa a ser zero.
  soldOut = true
  answerReservation(json(409, { code: 'INSUFFICIENT_CAPACITY', message: CONFLICT_MESSAGE, serverTime: Date.now(), requestId: 'teste' }))

  expect(await screen.findByText(CONFLICT_MESSAGE)).toBeTruthy()
  expect(await screen.findByText('0 de 2 ingressos disponíveis')).toBeTruthy()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Reservando…' })).toBeNull())
  expect(screen.queryByText('2 de 2 ingressos disponíveis')).toBeNull()
  expect(reservationRequests).toHaveLength(1)
})
