import type { IncomingMessage, ServerResponse } from 'node:http'
import { config } from '../../config/env.js'

const COOKIE_NAME = 'reservai_session'
export function getToken(request: IncomingMessage) {
  const value = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1)
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined
}
export function setSessionCookie(response: ServerResponse, token: string, expiresAt: number) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))}; Expires=${new Date(expiresAt).toUTCString()}${config.production ? '; Secure' : ''}`)
}
export function clearSessionCookie(response: ServerResponse) {
  response.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${config.production ? '; Secure' : ''}`)
}
