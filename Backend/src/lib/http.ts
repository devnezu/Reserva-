import type { IncomingMessage, ServerResponse } from 'node:http'
import { HttpError } from '../middlewares/error-handler.js'

export function json(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status)
  response.end(JSON.stringify(data))
}

export function readJson(request: IncomingMessage, maxBytes = 4096): Promise<unknown> {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'Envie os dados em JSON.')
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    request.on('data', (chunk: Buffer) => {
      if (settled) return
      size += chunk.length
      if (size > maxBytes) { settled = true; chunks.length = 0; reject(new HttpError(413, 'Solicitação muito grande.')); return }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (settled) return
      settled = true
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(new HttpError(400, 'JSON inválido.')) }
    })
    request.on('error', reject)
    request.on('aborted', () => reject(new HttpError(400, 'Solicitação interrompida.')))
  })
}
