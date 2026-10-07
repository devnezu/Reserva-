import { HttpError } from '../../middlewares/error-handler.js'

export function parseLogin(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Informe e-mail e senha.')
  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 1 || password.length > 128) throw new HttpError(400, 'Informe um e-mail válido e a senha.')
  return { email: email.trim().toLowerCase(), password }
}
