import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ApiError, authApi, SESSION_EXPIRED_EVENT, type AuthSession } from '@/api/auth'
import { AuthContext, type AuthStatus } from './auth-context'

const SYNC_KEY = 'reservai:auth-sync'
type State = { status: AuthStatus; user: AuthSession['user'] | null; expiresAt: number | null }
const anonymous: State = { status: 'anonymous', user: null, expiresAt: null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ ...anonymous, status: 'loading' })
  const generation = useRef(0)
  const mutation = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)

  const syncTabs = useCallback(() => {
    channel.current?.postMessage('refresh')
    // Only a notification is stored. Tokens and credentials remain out of browser storage.
    try { localStorage.setItem(SYNC_KEY, `${Date.now()}:${Math.random()}`) } catch { /* Storage may be disabled. */ }
  }, [])

  const refresh = useCallback(async () => {
    if (mutation.current) return
    const current = ++generation.current
    try {
      const session = await authApi.me()
      if (current === generation.current) setState({ ...session, status: 'authenticated' })
    } catch (error) {
      if (current !== generation.current) return
      if (error instanceof ApiError && error.status === 401) setState(anonymous)
      else setState((previous) => previous.status === 'authenticated' ? previous : { ...anonymous, status: 'error' })
    }
  }, [])

  const authenticate = useCallback(async (request: () => Promise<AuthSession>) => {
    mutation.current = true
    generation.current++
    try {
      const session = await request()
      generation.current++
      setState({ ...session, status: 'authenticated' })
      syncTabs()
    } finally { mutation.current = false }
  }, [syncTabs])

  const login = useCallback((email: string, password: string) => authenticate(() => authApi.login(email, password)), [authenticate])
  const register = useCallback((name: string, email: string, password: string) => authenticate(() => authApi.register(name, email, password)), [authenticate])

  const logout = useCallback(async () => {
    mutation.current = true
    generation.current++
    try {
      await authApi.logout()
      generation.current++
      setState(anonymous)
      syncTabs()
    } finally { mutation.current = false }
  }, [syncTabs])

  useEffect(() => {
    const invalidatePendingRequests = () => { generation.current++ }
    const onFocus = () => { void refresh() }
    const bootstrap = window.setTimeout(onFocus, 0)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    const onStorage = (event: StorageEvent) => { if (event.key === SYNC_KEY) void refresh() }
    const onExpired = () => { generation.current++; setState(anonymous); syncTabs() }
    const tabChannel = 'BroadcastChannel' in window ? new BroadcastChannel(SYNC_KEY) : null
    channel.current = tabChannel
    if (tabChannel) tabChannel.onmessage = onFocus
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    window.addEventListener('storage', onStorage)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(onFocus, 60000)
    return () => {
      invalidatePendingRequests()
      tabChannel?.close()
      channel.current = null
      window.clearTimeout(bootstrap)
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, syncTabs])

  useEffect(() => {
    if (state.expiresAt === null) return
    const timer = window.setTimeout(() => { void refresh() }, Math.max(0, state.expiresAt - Date.now() + 100))
    return () => window.clearTimeout(timer)
  }, [state.expiresAt, refresh])

  return <AuthContext value={{ ...state, login, register, logout, refresh }}>{children}</AuthContext>
}
