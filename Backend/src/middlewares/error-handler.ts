import type { ServerResponse } from 'node:http'

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_ERROR') { super(message) }
}

export function errorHandler(error: unknown, response: ServerResponse) {
  if (response.headersSent) { response.end(); return }
  if (!(error instanceof HttpError)) console.error('Erro interno:', error)
  if (error instanceof HttpError && error.status === 429) response.setHeader('Retry-After', '60')
  response.writeHead(error instanceof HttpError ? error.status : 500)
  response.end(JSON.stringify({
    message: error instanceof HttpError ? error.message : 'Não foi possível concluir a solicitação.',
    code: error instanceof HttpError ? error.code : 'INTERNAL_ERROR',
  }))
}
