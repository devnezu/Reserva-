import type { IncomingMessage } from 'node:http'
import { getToken } from '../modules/auth/cookies.js'
import { authRepository } from '../modules/auth/repository.js'
import { tokenHash } from '../modules/auth/service.js'
import { HttpError } from './error-handler.js'

export function requireAuth(request: IncomingMessage) {
  const token = getToken(request)
  const session = token ? authRepository.getSession(tokenHash(token)) : undefined
  if (!session) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.', 'UNAUTHENTICATED')
  return session
}
