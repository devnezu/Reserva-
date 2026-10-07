import type { IncomingMessage, ServerResponse } from 'node:http'
import { json } from '../../lib/http.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireTrustedRequest } from '../../middlewares/csrf.js'
import { HttpError } from '../../middlewares/error-handler.js'
import { database } from '../../database/connection.js'
import { cloudinaryStorage } from '../../storage/cloudinary.js'
import { readAvatar } from './image.js'
import { updateAvatar } from './service.js'

const uploading = new Set<number>()
export async function uploadAvatar(request: IncomingMessage, response: ServerResponse) {
  requireTrustedRequest(request)
  const session = requireAuth(request)
  cloudinaryStorage.assertConfigured()
  if (uploading.has(session.id) || uploading.size >= 4) throw new HttpError(429, 'Aguarde o envio atual e tente novamente.')
  const key = `avatar:${session.id}`
  const now = Date.now()
  database.prepare('DELETE FROM auth_attempts WHERE key = ? AND expires_at <= ?').run(key, now)
  const attempts = database.prepare('SELECT count FROM auth_attempts WHERE key = ?').get(key) as { count: number } | undefined
  if (attempts && attempts.count >= 10) throw new HttpError(429, 'Muitos envios. Tente novamente em 15 minutos.', 'RATE_LIMITED')
  database.prepare('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1').run(key, now + 15 * 60 * 1000)
  uploading.add(session.id)
  try {
    const image = await readAvatar(request)
    const avatarUrl = await updateAvatar(session.id, image, () => {
      if (requireAuth(request).id !== session.id) throw new HttpError(401, 'Entre novamente.', 'UNAUTHENTICATED')
    })
    json(response, 200, { user: { id: session.id, name: session.name, email: session.email, avatarUrl, role: session.role } })
  } finally { uploading.delete(session.id) }
}
