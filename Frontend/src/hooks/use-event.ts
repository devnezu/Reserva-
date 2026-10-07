import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/auth'
import { EVENTS_CHANGED, eventsApi, type EventRecord } from '@/api/events'

export function useEvent(reference: string) {
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const [result, setResult] = useState<{ reference: string; event?: EventRecord; error?: string; notFound?: boolean }>({ reference: '' })
  useEffect(() => {
    const controller = new AbortController()
    eventsApi.getPublic(reference, controller.signal).then(
      ({ event }) => { if (!controller.signal.aborted) setResult({ reference, event }) },
      (error: unknown) => {
        if (controller.signal.aborted) return
        const notFound = error instanceof ApiError && [400, 404].includes(error.status)
        setResult((previous) => ({ reference, event: !notFound && previous.reference === reference ? previous.event : undefined, notFound, error: error instanceof Error ? error.message : 'Não foi possível carregar o evento.' }))
      },
    )
    return () => controller.abort()
  }, [reference, revision])
  useEffect(() => {
    window.addEventListener(EVENTS_CHANGED, refresh)
    window.addEventListener('focus', refresh)
    const interval = window.setInterval(refresh, 60000)
    return () => { window.removeEventListener(EVENTS_CHANGED, refresh); window.removeEventListener('focus', refresh); window.clearInterval(interval) }
  }, [refresh])
  return { ...(result.reference === reference ? result : {}), loading: result.reference !== reference, refresh }
}
