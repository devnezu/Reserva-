import type { IncomingMessage, ServerResponse } from 'node:http'
import { authRoutes } from './modules/auth/routes.js'
import { filesRoutes } from './modules/files/routes.js'
import { errorHandler } from './middlewares/error-handler.js'
import { json } from './lib/http.js'

export async function app(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if (await authRoutes(request, response, pathname)) return
    if (await filesRoutes(request, response, pathname)) return
    if (request.method === 'GET' && pathname === '/api/hello') { json(response, 200, { message: 'Hello World' }); return }
    json(response, 404, { message: 'Rota não encontrada.' })
  } catch (error) { errorHandler(error, response) }
}
