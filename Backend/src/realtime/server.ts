import type { Server } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { config } from '../config/env.js'
import { requireAuth } from '../middlewares/require-auth.js'
import { HttpError } from '../middlewares/error-handler.js'
import { authEvents } from '../modules/auth/service.js'
import { authRepository } from '../modules/auth/repository.js'
import { latestNotificationId, notificationsAfter } from './outbox.js'
import { acquireLease, consumeRate, releaseLease, renewLease } from '../lib/resource-limits.js'
import { clientAddress } from '../lib/client-address.js'
import { serverTime } from '../lib/server-time.js'
import { database } from '../database/connection.js'

export function attachRealtime(server: Server) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 })
  const sessions = new Map<WebSocket, { hash: string; userId: number; cursor: number; alive: boolean; resumed: boolean; leases: string[] }>()
  const release = (leases: string[]) => { for (const id of leases) { try { releaseLease(id) } catch (error) { console.error('Falha ao liberar conex?o:', error) } } }
  server.on('upgrade', (request, socket, head) => {
    const leases: string[] = []
    socket.on('error', () => socket.destroy())
    if (request.url !== '/ws' || !request.headers.origin || !config.origins.has(request.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return
    }
    try {
      const ip = clientAddress(request)
      consumeRate('ws:open:' + ip, 60, 60000)
      const session = requireAuth(request)
      leases.push(acquireLease('ws', String(session.id), 128, 3, 45000))
      leases.push(acquireLease('ws-ip', ip, 128, 20, 45000))
      sockets.handleUpgrade(request, socket, head, (websocket) => {
        const state = { hash: session.token_hash, userId: session.id, cursor: latestNotificationId(), alive: true, resumed: false, leases }
        sessions.set(websocket, state)
        websocket.on('close', () => { sessions.delete(websocket); release(leases) })
        websocket.on('error', () => websocket.terminate())
        websocket.on('pong', () => { state.alive = true })
        websocket.on('message', (bytes) => {
          if (websocket.readyState !== WebSocket.OPEN) return
          try {
            if (!authRepository.getSession(state.hash)) { websocket.close(1008, 'Session ended'); return }
            consumeRate('ws:messages:' + state.userId, 60, 60000)
            const input = JSON.parse(bytes.toString()) as { type?: string; after?: number }
            // Resume is a single handshake operation, not a command to replay
            // the whole history repeatedly on an established connection.
            if (state.resumed || input?.type !== 'resume' || !Number.isSafeInteger(input.after) || input.after! < 0 || input.after! > latestNotificationId()) { websocket.close(1008, 'Invalid cursor'); return }
            state.resumed = true
            state.cursor = input.after!
          } catch { websocket.close(1008, 'Invalid or excessive messages') }
        })
        websocket.send(JSON.stringify({ message: 'Hello World' }))
        websocket.send(JSON.stringify({ type: 'realtime.ready', cursor: state.cursor, serverTime: serverTime() }))
      })
      socket.once('close', () => { if (![...sessions.values()].some((state) => state.leases === leases)) release(leases) })
    } catch (error) {
      release(leases)
      const status = error instanceof HttpError ? error.status : 503
      socket.end('HTTP/1.1 ' + status + ' Rejected\r\nConnection: close\r\n\r\n')
    }
  })
  const revoked = (hash: string) => { for (const [socket, state] of sessions) if (hash === state.hash) socket.close(1008, 'Session ended') }
  authEvents.on('revoked', revoked)
  const publish = setInterval(() => {
    for (const [socket, state] of sessions) {
      try {
        if (socket.readyState !== WebSocket.OPEN) continue
        if (!authRepository.getSession(state.hash)) { socket.close(1008, 'Session expired'); continue }
        if (socket.bufferedAmount > 1024 * 1024) { socket.close(1013, 'Slow connection'); continue }
        const latest = latestNotificationId()
        const rows = notificationsAfter(state.cursor, state.userId)
        for (const row of rows) {
          // Filter historical draft notifications too, including outbox entries
          // created before the security migration.
          const data = JSON.parse(row.payload) as { eventId?: number }
          const visible = row.type !== 'event.availability.updated' || (data.eventId !== undefined && database.prepare('SELECT 1 FROM events WHERE id = ? AND published = 1').get(data.eventId))
          if (visible) socket.send(JSON.stringify({ id: row.id, type: row.type, data, serverTime: serverTime() }))
          state.cursor = row.id
        }
        if (rows.length < 100) state.cursor = Math.max(state.cursor, latest)
        if (rows.length || latest > 0) socket.send(JSON.stringify({ type: 'realtime.cursor', cursor: state.cursor }))
      } catch (error) { console.error('Falha na publica??o de notifica??es:', error); socket.close(1011, 'Service unavailable') }
    }
  }, 250)
  const heartbeat = setInterval(() => {
    for (const [socket, state] of sessions) {
      try {
        if (socket.readyState !== WebSocket.OPEN) continue
        if (!state.alive || !state.leases.every((id) => renewLease(id, 45000))) { socket.terminate(); continue }
        state.alive = false; socket.ping()
      } catch { socket.terminate() }
    }
  }, 10000)
  publish.unref(); heartbeat.unref()
  return () => { clearInterval(publish); clearInterval(heartbeat); authEvents.off('revoked', revoked); for (const socket of sockets.clients) socket.terminate(); sockets.close() }
}
