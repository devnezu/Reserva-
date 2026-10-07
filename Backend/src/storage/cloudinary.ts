import { v2 as cloudinary } from 'cloudinary'
import { HttpError } from '../middlewares/error-handler.js'

function configure() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME
  let apiKey = process.env.CLOUDINARY_API_KEY ?? process.env.CLOUDINARY_APIKEY
  let apiSecret = process.env.CLOUDINARY_API_SECRET ?? process.env.CLOUDINARY_APISECRET
  const raw = process.env.CLOUDINARY_URL ?? (process.env.CLOUDINARY?.startsWith('cloudinary://') ? process.env.CLOUDINARY : undefined)
  if (raw) {
    try {
      const url = new URL(raw)
      if (url.protocol !== 'cloudinary:') return false
      cloudName = url.hostname
      apiKey = decodeURIComponent(url.username)
      apiSecret = decodeURIComponent(url.password)
    } catch { return false }
  }
  if (!cloudName || !apiKey || !apiSecret) return false
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
  return true
}

export const cloudinaryStorage = {
  configured: configure,
  assertConfigured() {
    if (!configure()) throw new HttpError(503, 'O envio de fotos ainda não está configurado. Tente novamente mais tarde.', 'UPLOAD_NOT_CONFIGURED')
  },
  upload(buffer: Buffer, publicId: string): Promise<{ publicId: string; url: string }> {
    this.assertConfigured()
    return new Promise((resolve, reject) => {
      const fail = () => reject(new HttpError(502, 'Não foi possível enviar a foto. Tente novamente.', 'UPLOAD_FAILED'))
      const stream = cloudinary.uploader.upload_stream({
        resource_type: 'image', type: 'upload', public_id: publicId, overwrite: false,
        allowed_formats: ['webp'], timeout: 15000,
      }, (error, result) => {
        // Provider errors can contain configuration details; only a safe message leaves this module.
        if (error || !result || result.public_id !== publicId || !result.secure_url.startsWith('https://')) { fail(); return }
        resolve({ publicId: result.public_id, url: result.secure_url })
      })
      stream.on('error', fail)
      stream.end(buffer)
    })
  },
  async remove(publicId: string) {
    this.assertConfigured()
    const options = { resource_type: 'image' as const, invalidate: true, timeout: 15000 }
    const result = await cloudinary.uploader.destroy(publicId, options)
    return result.result === 'ok' || result.result === 'not found'
  },
}
