import type { IncomingMessage } from 'node:http'
import { requireAuth } from './require-auth.js'
import { HttpError } from './error-handler.js'

export function requireAdmin(request: IncomingMessage) {
  const session = requireAuth(request)
  if (session.role !== 'admin') throw new HttpError(403, 'Este acesso é exclusivo para administradores.', 'FORBIDDEN')
  return session
}
