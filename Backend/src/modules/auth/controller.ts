import type { IncomingMessage, ServerResponse } from 'node:http'
import { json, readJson } from '../../lib/http.js'
import { requireAuth } from '../../middlewares/require-auth.js'
import { requireTrustedRequest } from '../../middlewares/csrf.js'
import { limitLogin } from '../../middlewares/login-rate-limit.js'
import { clearSessionCookie, getToken, setSessionCookie } from './cookies.js'
import { parseLogin } from './schemas.js'
import { login, revokeToken } from './service.js'

export const authController = {
  async login(request: IncomingMessage, response: ServerResponse) {
    requireTrustedRequest(request)
    const body = parseLogin(await readJson(request))
    limitLogin(request.socket.remoteAddress ?? 'unknown', body.email)
    const session = await login(body.email, body.password, getToken(request))
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
    try {
      const session = requireAuth(request)
      json(response, 200, { user: { id: session.id, name: session.name, email: session.email }, expiresAt: session.expires_at })
    } catch (error) {
      clearSessionCookie(response)
      throw error
    }
  },
}
