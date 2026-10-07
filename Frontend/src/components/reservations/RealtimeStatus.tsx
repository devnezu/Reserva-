import { useContext } from 'react'
import { RealtimeContext } from '@/context/realtime-context'

export function RealtimeStatus() {
  const status = useContext(RealtimeContext)
  // Só avisa quando a conexão cai; conectado, não mostra nada.
  if (status === 'connected') return null
  return <p role="status" className="flex items-center gap-2 text-xs text-neutral-600"><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-500" />Reconectando atualizações. As reservas continuam disponíveis.</p>
}
