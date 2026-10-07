import { HttpError } from '../../middlewares/error-handler.js'

export function parseLogin(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Informe e-mail e senha.')
  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' || password.length < 1 || password.length > 128) throw new HttpError(400, 'Informe um e-mail válido e a senha.')
  return { email: email.trim().toLowerCase(), password }
}

export function parseRegister(body: unknown) {
  const credentials = parseLogin(body)
  const { name } = body as Record<string, unknown>
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(name)) throw new HttpError(400, 'Informe um nome entre 2 e 100 caracteres.')
  if (credentials.password.length < 8) throw new HttpError(400, 'A senha deve ter entre 8 e 128 caracteres.')
  return { ...credentials, name: name.trim() }
}
