import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createWebSocket } from '@/api'
import { notifyEventsChanged } from '@/api/events'
import { notifyReservationsChanged, REALTIME_MESSAGE, REALTIME_READY, type RealtimeMessage } from '@/api/reservations'
import { RealtimeContext, type RealtimeStatus } from './realtime-context'

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth()
  const [state, setState] = useState<{ userId?: number; status: RealtimeStatus }>({ status: 'offline' })
  const userId = authStatus === 'authenticated' ? user?.id : undefined
  useEffect(() => {
    if (!userId) return
    let stopped = false, socket: WebSocket | undefined, timer = 0, changes = 0, retries = 0
    let cursor: number | null = null
    const status = (value: RealtimeStatus) => { if (!stopped) setState({ userId, status: value }) }
    const refresh = () => {
      window.clearTimeout(changes)
      changes = window.setTimeout(() => { notifyEventsChanged(); notifyReservationsChanged() }, 80)
    }
    function connect() {
      if (stopped || !navigator.onLine) { status('offline'); return }
      status('connecting')
      socket = createWebSocket()
      socket.onmessage = (event) => {
        if (stopped) return
        try {
          const message = JSON.parse(String(event.data)) as RealtimeMessage & { cursor?: number }
          if (message.type === 'realtime.ready') {
            retries = 0; status('connected')
            if (cursor !== null && cursor <= message.cursor!) socket?.send(JSON.stringify({ type: 'resume', after: cursor }))
            else cursor = message.cursor ?? 0
            window.dispatchEvent(new Event(REALTIME_READY)); refresh(); return
          }
          if (message.type === 'realtime.cursor') { cursor = Math.max(cursor ?? 0, message.cursor ?? 0); return }
          if (!Number.isSafeInteger(message.id) || message.id <= (cursor ?? 0)) return
          cursor = message.id
          window.dispatchEvent(new CustomEvent<RealtimeMessage>(REALTIME_MESSAGE, { detail: message }))
          refresh()
        } catch { /* Reconnection/HTTP refresh recovers malformed or missed messages. */ }
      }
      socket.onerror = () => socket?.close()
      socket.onclose = () => {
        if (stopped) return
        status('offline')
        timer = window.setTimeout(connect, Math.min(10000, 500 * 2 ** retries++) + Math.random() * 250)
      }
    }
    const online = () => { window.clearTimeout(timer); if (!socket || socket.readyState === WebSocket.CLOSED) connect() }
    const offline = () => { status('offline'); socket?.close() }
    window.addEventListener('online', online); window.addEventListener('offline', offline)
    connect()
    return () => { stopped = true; window.clearTimeout(timer); window.clearTimeout(changes); socket?.close(); window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [userId])
  return <RealtimeContext.Provider value={state.userId === userId ? state.status : 'offline'}>{children}</RealtimeContext.Provider>
}
