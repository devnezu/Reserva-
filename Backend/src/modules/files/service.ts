import { randomUUID } from 'node:crypto'
import { cloudinaryStorage } from '../../storage/cloudinary.js'
import { filesRepository } from './repository.js'

let cleaning = false
export async function cleanupFiles() {
  if (cleaning) return
  cleaning = true
  try {
    if (!cloudinaryStorage.configured()) return
    for (const { public_id: publicId } of filesRepository.pendingCleanup()) {
      try {
        if (await cloudinaryStorage.remove(publicId)) filesRepository.finishCleanup(publicId)
        else filesRepository.deferCleanup(publicId)
      } catch { filesRepository.deferCleanup(publicId) }
    }
  } catch (error) {
    console.error('Falha na limpeza de arquivos; será tentada novamente:', error)
  } finally { cleaning = false }
}

export async function updateAvatar(userId: number, buffer: Buffer, authorize: () => void) {
  const publicId = `reservai/avatars/${userId}/${randomUUID()}`
  try {
    const uploaded = await cloudinaryStorage.upload(buffer, publicId)
    filesRepository.replaceAvatar(userId, uploaded.publicId, uploaded.url, buffer.length, authorize)
    return uploaded.url
  } catch (error) {
    filesRepository.enqueueCleanup(publicId)
    throw error
  } finally { void cleanupFiles() }
}
