import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { json, readJson } from '../../lib/http.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireTrustedRequest } from '../../middlewares/csrf.js'
import { HttpError } from '../../middlewares/error-handler.js'
import { reservationsRepository } from './repository.js'

function key(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(value)) throw new HttpError(400, 'Envie um identificador válido para esta tentativa.', 'INVALID_REQUEST_ID')
  return value
}
function pageNumber(value: string | null, fallback: number, maximum: number) {
  if (value === null) return fallback
  const parsed = Number(value)
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(parsed) || parsed > maximum) throw new HttpError(400, 'Paginação inválida.')
  return parsed
}
export async function reservationsRoutes(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (!/^\/api\/reservations(?:\/|$)/.test(pathname)) return false
  let user = requireAuth(request)
  if (pathname === '/api/reservations' && request.method === 'GET') {
    const params = new URL(request.url!, 'http://localhost').searchParams
    json(response, 200, reservationsRepository.list(user.id, pageNumber(params.get('page'), 1, 1000000), pageNumber(params.get('pageSize'), 6, 50)))
    return true
  }
  if (pathname === '/api/reservations' && request.method === 'POST') {
    requireTrustedRequest(request)
    const requestId = key(request.headers['idempotency-key'])
    const input = await readJson(request) as { eventId?: unknown; quantity?: unknown } | null
    if (!input || typeof input !== 'object' || !Number.isSafeInteger(input.eventId) || (input.eventId as number) < 1) throw new HttpError(400, 'Evento inválido.', 'INVALID_EVENT')
    if (typeof input.quantity !== 'number' || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 4) throw new HttpError(400, 'Escolha uma quantidade inteira entre 1 e 4 ingressos.', 'INVALID_QUANTITY')
    user = requireAuth(request) // Recheck after asynchronous body reading.
    const result = reservationsRepository.create(user.id, input.eventId as number, input.quantity, requestId)
    json(response, result.status, result.body)
    return true
  }
  const match = /^\/api\/reservations\/([a-f0-9-]{36})(?:\/(confirm|cancel))?$/.exec(pathname)
  if (!match) throw new HttpError(404, 'Reserva não encontrada.', 'RESERVATION_NOT_FOUND')
  if (!match[2] && request.method === 'GET') { json(response, 200, reservationsRepository.get(user.id, match[1])); return true }
  if (match[2] && request.method === 'POST') {
    requireTrustedRequest(request)
    const requestId = request.headers['x-request-id'] ? key(request.headers['x-request-id']) : randomUUID()
    const result = reservationsRepository.transition(user.id, match[1], match[2] as 'confirm' | 'cancel', requestId)
    json(response, result.status, result.body)
    return true
  }
  return false
}
