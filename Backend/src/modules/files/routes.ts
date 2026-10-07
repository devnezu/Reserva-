import type { IncomingMessage, ServerResponse } from 'node:http'
import { uploadAvatar } from './controller.js'

export async function filesRoutes(request: IncomingMessage, response: ServerResponse, pathname: string) {
  if (request.method !== 'POST' || pathname !== '/api/users/me/avatar') return false
  await uploadAvatar(request, response)
  return true
}
