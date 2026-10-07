import { randomUUID } from 'node:crypto'
import { cloudinaryStorage } from '../../storage/cloudinary.js'
import { filesRepository } from './repository.js'

let cleaning = false
export async function cleanupFiles() {
  if (cleaning || !cloudinaryStorage.configured()) return
  cleaning = true
  try {
    for (const { public_id: publicId } of filesRepository.pendingCleanup()) {
      try {
        if (await cloudinaryStorage.remove(publicId)) filesRepository.finishCleanup(publicId)
      } catch { /* Persisted jobs are retried later, including after restart. */ }
    }
  } finally { cleaning = false }
}

export async function updateAvatar(userId: number, buffer: Buffer, authorize: () => void) {
  const publicId = `reservai/avatars/${userId}/${randomUUID()}`
  try {
    const uploaded = await cloudinaryStorage.upload(buffer, publicId)
    authorize() // A revoked or expired session cannot change the profile after a slow upload.
    filesRepository.replaceAvatar(userId, uploaded.publicId, uploaded.url, buffer.length)
    return uploaded.url
  } catch (error) {
    filesRepository.enqueueCleanup(publicId)
    throw error
  } finally { void cleanupFiles() }
}
