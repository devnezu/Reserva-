import type { IncomingMessage, ServerResponse } from 'node:http'
import { json, readJson } from '../../lib/http.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireTrustedRequest } from '../../middlewares/csrf.js'
import { limitLogin } from '../../middlewares/login-rate-limit.js'
import { clientAddress } from '../../lib/client-address.js'
import { clearSessionCookie, getToken, setSessionCookie } from './cookies.js'
import { parseLogin, parseRegister } from './schemas.js'
import { login, register, revokeToken } from './service.js'

export const authController = {
  async register(request: IncomingMessage, response: ServerResponse) {
    requireTrustedRequest(request)
    const body = parseRegister(await readJson(request))
    limitLogin(clientAddress(request), body.email, 'register')
    const session = await register(body.name, body.email, body.password, getToken(request))
    setSessionCookie(response, session.token, session.expiresAt)
    json(response, 201, { user: session.user, expiresAt: session.expiresAt })
  },
  async login(request: IncomingMessage, response: ServerResponse) {
    requireTrustedRequest(request)
    const body = parseLogin(await readJson(request))
    const address = clientAddress(request)
    limitLogin(address, body.email)
    const session = await login(body.email, body.password, getToken(request), address)
    setSessionCookie(response, session.token, session.expiresAt)
    json(response, 200, { user: session.user, expiresAt: session.expiresAt })
  },
  logout(request: IncomingMessage, response: ServerResponse) {
    requireTrustedRequest(request)
    revokeToken(getToken(request))
    clearSessionCookie(response)
    response.writeHead(204)
    response.end()
  },
  me(request: IncomingMessage, response: ServerResponse) {
    // A stale GET /me response must never clear a newer login cookie in another tab.
    const session = requireAuth(request)
    json(response, 200, { user: { id: session.id, name: session.name, email: session.email, avatarUrl: session.avatar_url, role: session.role }, expiresAt: session.expires_at })
  },
}
