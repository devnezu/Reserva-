import type { IncomingMessage } from 'node:http'
import sharp from 'sharp'
import { HttpError } from '../../middlewares/error-handler.js'

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 100_000_000
const formats = new Map([['image/jpeg', 'jpeg'], ['image/png', 'png'], ['image/webp', 'webp']])

async function readImage(request: IncomingMessage, purpose: 'avatar' | 'banner') {
  const mime = request.headers['content-type']?.split(';')[0].trim().toLowerCase() ?? ''
  const expectedFormat = formats.get(mime)
  if (!expectedFormat) throw new HttpError(415, 'Escolha uma imagem JPG, PNG ou WebP.')
  const length = Number(request.headers['content-length'])
  if (length > MAX_IMAGE_BYTES) throw new HttpError(413, 'A foto deve ter no máximo 25 MB.')
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true; chunks.length = 0
      reject(new HttpError(408, 'O envio demorou demais. Tente novamente.'))
      request.destroy()
    }, 15000)
    timer.unref()
    request.on('data', (chunk: Buffer) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_IMAGE_BYTES) {
        settled = true
        clearTimeout(timer)
        chunks.length = 0
        reject(new HttpError(413, 'A foto deve ter no máximo 25 MB.'))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (size === 0) reject(new HttpError(400, 'Selecione uma foto.'))
      else resolve(Buffer.concat(chunks))
    })
    request.on('error', (error) => { clearTimeout(timer); reject(error) })
    request.on('aborted', () => { clearTimeout(timer); reject(new HttpError(400, 'Envio interrompido.')) })
  })
  try {
    // Allow high-resolution camera photos and non-critical decoder warnings.
    // Truncated/corrupt pixel data still fails; decoded output is re-encoded below.
    const image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' }).timeout({ seconds: 15 })
    const metadata = await image.metadata()
    if (metadata.format !== expectedFormat || (metadata.pages ?? 1) !== 1) throw new HttpError(415, 'Envie uma foto JPG, PNG ou WebP sem animação.')
    // Decode, orient, crop and re-encode: metadata and the original bytes are never published.
    const oriented = image.rotate()
    const resized = purpose === 'avatar'
      ? oriented.resize(512, 512, { fit: 'cover', position: 'centre' })
      : oriented.resize(1920, 1280, { fit: 'inside', withoutEnlargement: true })
    return await resized.webp({ quality: 85 }).toBuffer({ resolveWithObject: true })
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof Error && /pixel limit/i.test(error.message)) throw new HttpError(413, 'A foto deve ter no máximo 100 megapixels.', 'IMAGE_RESOLUTION_TOO_LARGE')
    throw new HttpError(400, 'Não foi possível ler a imagem. O arquivo pode estar incompleto ou inválido. Escolha outra foto JPG, PNG ou WebP.', 'INVALID_IMAGE')
  }
}

export async function readAvatar(request: IncomingMessage) { return (await readImage(request, 'avatar')).data }
export async function readBanner(request: IncomingMessage) { return readImage(request, 'banner') }
