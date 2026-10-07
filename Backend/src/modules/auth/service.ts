import { createHash, randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { config } from '../../config/env.js'
import { HttpError } from '../../middlewares/error-handler.js'
import { authRepository } from './repository.js'
import { getDummyHash, verifyPassword } from './password.js'

export const authEvents = new EventEmitter()
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
let verifying = 0

export function revokeToken(token?: string) {
  if (!token) return
  const hash = tokenHash(token)
  authRepository.deleteSession(hash)
  authEvents.emit('revoked', hash)
}

export async function login(email: string, password: string, previousToken?: string) {
  if (verifying >= 4) throw new HttpError(503, 'Acesso ocupado. Tente novamente em instantes.')
  verifying++
  let user
  try {
    user = authRepository.findUser(email)
    const valid = await verifyPassword(user?.password_hash ?? await getDummyHash(), password)
    if (!valid || !user) throw new HttpError(401, 'E-mail ou senha incorretos.', 'INVALID_CREDENTIALS')
  } finally { verifying-- }
  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + config.sessionDurationMs
  authRepository.createSession(tokenHash(token), user.id, expiresAt)
  revokeToken(previousToken)
  return { token, user: { id: user.id, name: user.name, email: user.email }, expiresAt }
}
