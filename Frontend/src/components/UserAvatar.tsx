import { useState } from 'react'
import type { AuthUser } from '@/api/auth'
import { cn } from '@/lib/utils'

export function UserAvatar({ user, className }: { user: AuthUser | null; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (user?.avatarUrl && user.avatarUrl !== failedUrl) return <img src={user.avatarUrl} alt="" draggable={false} onError={() => setFailedUrl(user.avatarUrl)} className={cn('shrink-0 rounded-full object-cover', className)} />
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || '?'
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold uppercase text-[#ED1C24]', className)}>{initials}</span>
}
