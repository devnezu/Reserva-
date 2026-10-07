import type { IncomingMessage, ServerResponse } from 'node:http'
import { authController } from './controller.js'

export async function authRoutes(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (request.method === 'POST' && pathname === '/api/auth/register') await authController.register(request, response)
  else if (request.method === 'POST' && pathname === '/api/auth/login') await authController.login(request, response)
  else if (request.method === 'POST' && pathname === '/api/auth/logout') authController.logout(request, response)
  else if (request.method === 'GET' && pathname === '/api/auth/me') authController.me(request, response)
  else return false
  return true
}
