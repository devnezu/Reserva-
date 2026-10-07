import { afterEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthProvider'
import { useAuth } from '@/hooks/use-auth'
import { apiRequest } from '@/api/auth'

const rafael = { id: 1, name: 'Rafael', email: 'dry1@reservai.com', avatarUrl: null, role: 'user' }
const gustavo = { id: 2, name: 'Gustavo', email: 'dry2@reservai.com', avatarUrl: null, role: 'admin' }
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function Probe() {
  const { user, status, login } = useAuth()
  return <><p>{status}:{user?.name ?? 'visitante'}</p><button onClick={() => { void login('dry2@reservai.com', 'dryedemais321') }}>Login novo</button><button onClick={() => { void apiRequest('/api/reservations/old').catch(() => {}) }}>Consulta antiga</button></>
}
afterEach(() => vi.unstubAllGlobals())

test('a delayed 401 never clears a newer successful login', async () => {
  let current = rafael
  let answer!: (value: Response) => void
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (input === '/api/auth/me') return response(200, { user: current, expiresAt: Date.now() + 3600000 })
    if (input === '/api/auth/login') { current = gustavo; return response(200, { user: current, expiresAt: Date.now() + 3600000 }) }
    return new Promise<Response>((resolve) => { answer = resolve })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<AuthProvider><Probe /></AuthProvider>)
  expect(await screen.findByText('authenticated:Rafael')).toBeTruthy()
  const user = userEvent.setup()
  await user.click(screen.getByText('Consulta antiga'))
  await user.click(screen.getByText('Login novo'))
  expect(await screen.findByText('authenticated:Gustavo')).toBeTruthy()
  await act(async () => answer(response(401, { code: 'UNAUTHENTICATED', message: 'Sessão antiga revogada' })))
  await waitFor(() => expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/me').length).toBeGreaterThan(1))
  expect(screen.getByText('authenticated:Gustavo')).toBeTruthy()
  expect(screen.queryByText('anonymous:visitante')).toBeNull()
})

test('a 401 after session expiry really clears access after rechecking identity', async () => {
  let expired = false
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (input === '/api/auth/me' && !expired) return response(200, { user: rafael, expiresAt: Date.now() + 3600000 })
    return response(401, { code: 'UNAUTHENTICATED', message: 'Sessão expirada' })
  }))
  render(<AuthProvider><Probe /></AuthProvider>)
  await screen.findByText('authenticated:Rafael')
  expired = true
  await userEvent.setup().click(screen.getByText('Consulta antiga'))
  expect(await screen.findByText('anonymous:visitante')).toBeTruthy()
})

test('session changes in another tab are preserved when an obsolete request returns 401', async () => {
  let current = rafael
  let answer!: (value: Response) => void
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => input === '/api/auth/me'
    ? response(200, { user: current, expiresAt: Date.now() + 3600000 })
    : new Promise<Response>((resolve) => { answer = resolve })))
  render(<AuthProvider><Probe /></AuthProvider>)
  await screen.findByText('authenticated:Rafael')
  await userEvent.setup().click(screen.getByText('Consulta antiga'))
  current = gustavo
  await act(async () => window.dispatchEvent(new Event('focus')))
  await screen.findByText('authenticated:Gustavo')
  await act(async () => answer(response(401, { code: 'UNAUTHENTICATED', message: 'Sessão antiga' })))
  expect(screen.getByText('authenticated:Gustavo')).toBeTruthy()
})
