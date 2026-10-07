import { useCallback, useEffect, useState } from 'react'
import { EVENTS_CHANGED, eventsApi, type EventsPage, type EventsQuery } from '@/api/events'

export function useEvents({ page = 1, pageSize = 6, q = '', genre = '', manage = false }: EventsQuery = {}) {
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const key = JSON.stringify([page, pageSize, q, genre, manage, revision])
  const [result, setResult] = useState<{ key: string; data?: EventsPage; error?: string }>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    eventsApi.list({ page, pageSize, q, genre, manage }, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }) },
      (error: unknown) => { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : 'Não foi possível carregar os eventos.' }) },
    )
    return () => controller.abort()
  }, [page, pageSize, q, genre, manage, key])
  useEffect(() => {
    window.addEventListener(EVENTS_CHANGED, refresh)
    window.addEventListener('focus', refresh)
    const interval = window.setInterval(refresh, 60000)
    return () => { window.removeEventListener(EVENTS_CHANGED, refresh); window.removeEventListener('focus', refresh); window.clearInterval(interval) }
  }, [refresh])
  // Mantém a última lista na tela enquanto a nova carrega, para a troca de filtro não piscar.
  return { data: result.data, error: result.key === key ? result.error : undefined, loading: result.key !== key, refresh }
}
