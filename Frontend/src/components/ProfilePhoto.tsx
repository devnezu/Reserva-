import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'

export function ProfilePhoto() {
  const { user, uploadAvatar } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const submitting = useRef(false)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || submitting.current) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { notify.error('Escolha uma imagem JPG, PNG ou WebP.'); return }
    if (file.size > 5 * 1024 * 1024) { notify.error('A foto deve ter no máximo 5 MB.'); return }
    submitting.current = true
    setBusy(true)
    setPreview(URL.createObjectURL(file))
    try { await uploadAvatar(file); notify.success('Foto de perfil atualizada.') }
    catch (error) { notify.error(error instanceof Error && error.name !== 'TypeError' ? error.message : 'Não foi possível enviar a foto. Tente novamente.') }
    finally { submitting.current = false; setBusy(false); setPreview(null) }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-5 border-b border-black/10 pb-6" aria-busy={busy}>
      <UserAvatar user={user ? { ...user, avatarUrl: preview ?? user.avatarUrl } : null} className="size-24 text-3xl ring-4 ring-[#ED1C24]/15" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold uppercase">Foto de perfil</p>
        <p id={`${inputId}-help`} className="mt-1 text-xs text-neutral-600">JPG, PNG ou WebP. Até 5 MB.</p>
        <input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Selecionar foto de perfil" aria-describedby={`${inputId}-help`} onChange={(event) => { void select(event) }} disabled={busy} className="sr-only" tabIndex={-1} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()} className="mt-3 rounded-full border-[#ED1C24]/30 text-[#ED1C24] hover:bg-[#ED1C24]/5 hover:text-[#ED1C24]">{busy ? 'Enviando foto…' : user?.avatarUrl ? 'Trocar foto' : 'Adicionar foto'}</Button>
        {busy && <p role="status" className="mt-2 text-xs text-neutral-600">Salvando sua foto…</p>}
      </div>
    </div>
  )
}
