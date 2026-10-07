import type { IncomingMessage } from 'node:http'
import { config } from '../config/env.js'
import { HttpError } from './error-handler.js'

export function requireTrustedRequest(request: IncomingMessage) {
  // Custom headers require a preflight for cross-origin callers. No permissive CORS is enabled.
  if (!request.headers.origin || !config.origins.has(request.headers.origin) || request.headers['x-requested-with'] !== 'Reservai') throw new HttpError(403, 'Origem da solicitação não permitida.', 'INVALID_ORIGIN')
}
