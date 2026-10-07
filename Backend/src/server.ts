import { createServer } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { database } from './database/connection.js'
import { migrate } from './database/migrate.js'
import { seed } from './database/seed.js'
import { config } from './config/env.js'
import { app } from './app.js'
import { requireAuth } from './middlewares/require-auth.js'
import { authEvents } from './modules/auth/service.js'
import { authRepository } from './modules/auth/repository.js'

// Migrations and development seed finish before accepting any requests.
migrate()
if (config.seedOnStart) await seed()
const server = createServer((request, response) => { void app(request, response) })
server.requestTimeout = 15000
const sockets = new WebSocketServer({ noServer: true })
const sessions = new Map<WebSocket, string>()
server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/ws' || !request.headers.origin || !config.origins.has(request.headers.origin)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
    return
  }
  try {
    const session = requireAuth(request)
    sockets.handleUpgrade(request, socket, head, (websocket) => {
      sessions.set(websocket, session.token_hash)
      websocket.on('close', () => sessions.delete(websocket))
      sockets.emit('connection', websocket)
    })
  } catch {
    socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
  }
})
sockets.on('connection', (socket) => {
  socket.on('error', console.error)
  socket.send(JSON.stringify({ message: 'Hello World' }))
})
authEvents.on('revoked', (hash: string) => {
  for (const [socket, sessionHash] of sessions) if (hash === sessionHash) socket.close(1008, 'Session ended')
})
const cleanup = setInterval(() => {
  for (const [socket, hash] of sessions) if (!authRepository.getSession(hash)) socket.close(1008, 'Session expired')
  authRepository.cleanup()
}, 30000)
cleanup.unref()
server.listen(config.port, config.host, () => console.log(`Backend: http://${config.host}:${config.port}`))
function shutdown() {
  clearInterval(cleanup)
  for (const socket of sockets.clients) socket.terminate()
  sockets.close()
  server.close(() => { database.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
