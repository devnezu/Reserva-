import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { database } from './database.js'

const port = Number(process.env.PORT ?? 3001)
const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (request.method === 'GET' && request.url === '/api/hello') {
    response.end(JSON.stringify({ message: 'Hello World' }))
    return
  }
  response.writeHead(404)
  response.end(JSON.stringify({ message: 'Not found' }))
})
const sockets = new WebSocketServer({ server, path: '/ws' })
sockets.on('connection', (socket) => {
  socket.on('error', console.error)
  socket.send(JSON.stringify({ message: 'Hello World' }))
})
server.listen(port, '127.0.0.1', () => console.log(`Backend: http://127.0.0.1:${port}`))
function shutdown() {
  for (const socket of sockets.clients) socket.terminate()
  sockets.close()
  server.close(() => { database.close(); process.exit(0) })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
