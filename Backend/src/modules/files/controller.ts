import type { IncomingMessage, ServerResponse } from 'node:http'
import { json } from '../../lib/http.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireTrustedRequest } from '../../middlewares/csrf.js'
import { HttpError } from '../../middlewares/error-handler.js'
import { acquireLease, consumeRate, releaseLease } from '../../lib/resource-limits.js'
import { cloudinaryStorage } from '../../storage/cloudinary.js'
import { readAvatar } from './image.js'
import { updateAvatar } from './service.js'

export async function uploadAvatar(request: IncomingMessage, response: ServerResponse) {
  requireTrustedRequest(request)
  const session = requireAuth(request)
  cloudinaryStorage.assertConfigured()
  consumeRate(`upload:${session.id}`, 10, 900000)
  const lease = acquireLease('upload', String(session.id), 2, 1, 120000)
  try {
    const image = await readAvatar(request)
    const avatarUrl = await updateAvatar(session.id, image, () => {
      if (requireAuth(request).id !== session.id) throw new HttpError(401, 'Entre novamente.', 'UNAUTHENTICATED')
    })
    json(response, 200, { user: { id: session.id, name: session.name, email: session.email, avatarUrl, role: session.role } })
  } finally { releaseLease(lease) }
}
