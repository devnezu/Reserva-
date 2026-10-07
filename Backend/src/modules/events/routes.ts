import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { database } from '../../database/connection.js'
import { json, readJson } from '../../lib/http.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireAdmin } from '../../middlewares/require-admin.js'
import { requireTrustedRequest } from '../../middlewares/csrf.js'
import { HttpError } from '../../middlewares/error-handler.js'
import { cloudinaryStorage } from '../../storage/cloudinary.js'
import { readBanner } from '../files/image.js'
import { filesRepository } from '../files/repository.js'
import { cleanupFiles } from '../files/service.js'
import { eventDto, eventsRepository } from './repository.js'
import { parseEvent, parseId, parseQuery } from './schemas.js'

const uploading = new Set<number>()
function find(id: number) {
  const row = eventsRepository.find(id)
  if (!row) throw new HttpError(404, 'Evento não encontrado.')
  return row
}
export async function eventsRoutes(request: IncomingMessage, response: ServerResponse, pathname: string) {
  const publicMatch = /^\/api\/events\/public\/([^/]+)$/.exec(pathname)
  if (publicMatch && request.method === 'GET') {
    const reference = publicMatch[1]
    if (reference.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(reference)) throw new HttpError(400, 'Endereço do evento inválido.')
    const row = eventsRepository.findPublished(reference)
    if (!row) throw new HttpError(404, 'Evento não encontrado.')
    json(response, 200, { event: eventDto(row, true) })
    return true
  }
  if (pathname === '/api/events' && request.method === 'GET') {
    json(response, 200, eventsRepository.list(parseQuery(new URL(request.url!, 'http://localhost')), false))
    return true
  }
  if (pathname === '/api/events/manage' && request.method === 'GET') {
    requireAdmin(request)
    json(response, 200, eventsRepository.list(parseQuery(new URL(request.url!, 'http://localhost')), true))
    return true
  }
  if (pathname === '/api/events' && request.method === 'POST') {
    requireTrustedRequest(request)
    const user = requireAdmin(request)
    const input = parseEvent(await readJson(request, 96 * 1024))
    if (input.expiresAt <= Date.now()) throw new HttpError(400, 'O prazo de reserva deve estar no futuro.')
    const id = eventsRepository.create(input, user.id)
    json(response, 201, { event: eventDto(find(id), true) })
    return true
  }
  const match = /^\/api\/events\/([^/]+)(\/banner)?$/.exec(pathname)
  if (!match) return false
  const id = parseId(match[1])
  if (!match[2] && request.method === 'GET') {
    const user = requireAuth(request)
    const row = find(id)
    if (!row.published && user.role !== 'admin') throw new HttpError(404, 'Evento não encontrado.')
    json(response, 200, { event: eventDto(row, true) })
    return true
  }
  if (!match[2] && (request.method === 'PATCH' || request.method === 'DELETE')) {
    requireTrustedRequest(request)
    requireAdmin(request)
    find(id)
    if (request.method === 'DELETE') {
      eventsRepository.archive(id)
      json(response, 204, undefined)
    } else {
      const input = parseEvent(await readJson(request, 96 * 1024))
      if (!eventsRepository.update(id, input)) throw new HttpError(409, 'A capacidade não pode ser menor que o total de ingressos já reservados.')
      json(response, 200, { event: eventDto(find(id), true) })
    }
    return true
  }
  if (match[2] && request.method === 'POST') {
    requireTrustedRequest(request)
    const user = requireAdmin(request)
    find(id)
    cloudinaryStorage.assertConfigured()
    if (uploading.has(user.id) || uploading.size >= 4) throw new HttpError(429, 'Aguarde o envio atual e tente novamente.')
    const now = Date.now()
    const key = `banner:${user.id}`
    database.prepare('DELETE FROM auth_attempts WHERE key = ? AND expires_at <= ?').run(key, now)
    const attempts = database.prepare('SELECT count FROM auth_attempts WHERE key = ?').get(key) as { count: number } | undefined
    if (attempts && attempts.count >= 10) throw new HttpError(429, 'Muitos envios. Tente novamente em 15 minutos.', 'RATE_LIMITED')
    database.prepare('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1').run(key, now + 15 * 60 * 1000)
    uploading.add(user.id)
    const publicId = `reservai/banners/${id}/${randomUUID()}`
    let attempted = false
    try {
      const image = await readBanner(request)
      attempted = true
      const uploaded = await cloudinaryStorage.upload(image.data, publicId)
      if (requireAdmin(request).id !== user.id) throw new HttpError(401, 'Entre novamente.', 'UNAUTHENTICATED')
      find(id) // An event archived during a slow upload must not be republished.
      filesRepository.replaceEventBanner(id, user.id, uploaded.publicId, uploaded.url, image.data.length, image.info.width, image.info.height)
      json(response, 200, { event: eventDto(find(id), true) })
    } catch (error) {
      if (attempted) filesRepository.enqueueCleanup(publicId)
      throw error
    } finally { uploading.delete(user.id); void cleanupFiles() }
    return true
  }
  return false
}
