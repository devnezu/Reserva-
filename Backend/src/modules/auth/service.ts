import { createHash, randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { config } from '../../config/env.js'
import { HttpError } from '../../middlewares/error-handler.js'
import { authRepository } from './repository.js'
import { getDummyHash, hashPassword, verifyPassword } from './password.js'

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

export async function register(name: string, email: string, password: string, previousToken?: string) {
  // Share the Argon2 concurrency bound with login to keep memory usage bounded.
  if (verifying >= 4) throw new HttpError(503, 'Acesso ocupado. Tente novamente em instantes.')
  verifying++
  let passwordHash
  try { passwordHash = await hashPassword(password) }
  finally { verifying-- }
  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + config.sessionDurationMs
  // The unique email constraint also covers simultaneous registration requests.
  const user = authRepository.createAccount(name, email, passwordHash, tokenHash(token), expiresAt)
  if (!user) throw new HttpError(409, 'Este e-mail já está cadastrado. Entre com sua conta.', 'EMAIL_IN_USE')
  revokeToken(previousToken)
  return { token, user, expiresAt }
}
