// Loaded only by test processes with --import. Runtime has no mock/storage mode.
import { Writable } from 'node:stream'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { v2 as cloudinary } from 'cloudinary'

const controls = () => existsSync(process.env.CLOUDINARY_TEST_CONTROL) ? JSON.parse(readFileSync(process.env.CLOUDINARY_TEST_CONTROL, 'utf8')) : {}
const log = (entry) => appendFileSync(process.env.CLOUDINARY_TEST_LOG, JSON.stringify(entry) + '\n')
cloudinary.uploader.upload_stream = (options, callback) => {
  const chunks = []
  return new Writable({
    write(chunk, _, done) { chunks.push(chunk); done() },
    final(done) {
      const data = Buffer.concat(chunks)
      const control = controls()
      void sharp(data).metadata().then((metadata) => {
        log({ action: 'upload', publicId: options.public_id, format: metadata.format, width: metadata.width, height: metadata.height, exif: Boolean(metadata.exif), bytes: data.length })
        setTimeout(() => {
          if (control.failUpload) callback({ message: 'Provider secret details must never escape', http_code: 500 })
          else callback(null, { public_id: options.public_id, secure_url: `https://res.cloudinary.com/test/image/upload/${options.public_id}.webp` })
          done()
        }, control.delayUploadMs ?? 0)
      }).catch(done)
    },
  })
}
cloudinary.uploader.destroy = async (publicId) => {
  log({ action: 'remove', publicId })
  if (controls().failRemove) throw new Error('Simulated unavailable provider')
  return { result: 'ok' }
}
