import type { IncomingMessage } from 'node:http'
import sharp from 'sharp'
import { HttpError } from '../../middlewares/error-handler.js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const formats = new Map([['image/jpeg', 'jpeg'], ['image/png', 'png'], ['image/webp', 'webp']])

export async function readAvatar(request: IncomingMessage) {
  const mime = request.headers['content-type']?.split(';')[0].trim().toLowerCase() ?? ''
  const expectedFormat = formats.get(mime)
  if (!expectedFormat) throw new HttpError(415, 'Escolha uma imagem JPG, PNG ou WebP.')
  const length = Number(request.headers['content-length'])
  if (length > MAX_IMAGE_BYTES) throw new HttpError(413, 'A foto deve ter no máximo 5 MB.')
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    request.on('data', (chunk: Buffer) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_IMAGE_BYTES) {
        settled = true
        chunks.length = 0
        reject(new HttpError(413, 'A foto deve ter no máximo 5 MB.'))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (settled) return
      settled = true
      if (size === 0) reject(new HttpError(400, 'Selecione uma foto.'))
      else resolve(Buffer.concat(chunks))
    })
    request.on('error', reject)
    request.on('aborted', () => reject(new HttpError(400, 'Envio interrompido.')))
  })
  try {
    const image = sharp(buffer, { limitInputPixels: 20_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (metadata.format !== expectedFormat || (metadata.pages ?? 1) !== 1) throw new HttpError(415, 'Envie uma foto JPG, PNG ou WebP sem animação.')
    // Decode, orient, crop and re-encode: metadata and the original bytes are never published.
    return await image.rotate().resize(512, 512, { fit: 'cover', position: 'centre' }).webp({ quality: 85 }).toBuffer()
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'Não foi possível ler a imagem. Escolha uma foto válida de até 20 megapixels.')
  }
}
