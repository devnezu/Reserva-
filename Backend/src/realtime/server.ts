import type { Server } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { config } from '../config/env.js'
import { requireAuth } from '../middlewares/require-auth.js'
import { authEvents } from '../modules/auth/service.js'
import { authRepository } from '../modules/auth/repository.js'
import { latestNotificationId, notificationsAfter } from './outbox.js'

export function attachRealtime(server: Server) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 })
  const sessions = new Map<WebSocket, { hash: string; userId: number; cursor: number; alive: boolean }>()
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws' || !request.headers.origin || !config.origins.has(request.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return
    }
    try {
      const session = requireAuth(request)
      sockets.handleUpgrade(request, socket, head, (websocket) => {
        const state = { hash: session.token_hash, userId: session.id, cursor: latestNotificationId(), alive: true }
        sessions.set(websocket, state)
        websocket.on('close', () => sessions.delete(websocket))
        websocket.on('error', () => websocket.terminate())
        websocket.on('pong', () => { state.alive = true })
        websocket.on('message', (bytes) => {
          if (!authRepository.getSession(state.hash)) { websocket.close(1008, 'Session ended'); return }
          try {
            const input = JSON.parse(bytes.toString()) as { type?: string; after?: number }
            if (input.type !== 'resume' || !Number.isSafeInteger(input.after) || input.after! < 0 || input.after! > latestNotificationId()) { websocket.close(1008, 'Invalid cursor'); return }
            state.cursor = input.after!
          } catch { websocket.close(1008, 'Invalid message') }
        })
        websocket.send(JSON.stringify({ message: 'Hello World' }))
        websocket.send(JSON.stringify({ type: 'realtime.ready', cursor: state.cursor, serverTime: Date.now() }))
      })
    } catch { socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n') }
  })
  const revoked = (hash: string) => { for (const [socket, state] of sessions) if (hash === state.hash) socket.close(1008, 'Session ended') }
  authEvents.on('revoked', revoked)
  const publish = setInterval(() => {
    try {
      for (const [socket, state] of sessions) {
        if (socket.readyState !== WebSocket.OPEN) continue
        if (!authRepository.getSession(state.hash)) { socket.close(1008, 'Session expired'); continue }
        if (socket.bufferedAmount > 1024 * 1024) { socket.close(1013, 'Slow connection'); continue }
        const rows = notificationsAfter(state.cursor)
        for (const row of rows) {
          if (row.user_id === null || row.user_id === state.userId) socket.send(JSON.stringify({ id: row.id, type: row.type, data: JSON.parse(row.payload), serverTime: Date.now() }))
          state.cursor = row.id
        }
        if (rows.length) socket.send(JSON.stringify({ type: 'realtime.cursor', cursor: state.cursor }))
      }
    } catch (error) { console.error('Falha na publicação de notificações:', error) }
  }, 250)
  const heartbeat = setInterval(() => {
    for (const [socket, state] of sessions) {
      if (!state.alive) { socket.terminate(); continue }
      state.alive = false; socket.ping()
    }
  }, 30000)
  publish.unref(); heartbeat.unref()
  return () => { clearInterval(publish); clearInterval(heartbeat); authEvents.off('revoked', revoked); for (const socket of sockets.clients) socket.terminate(); sockets.close() }
}
