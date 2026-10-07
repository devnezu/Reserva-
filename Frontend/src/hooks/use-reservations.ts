import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/api/auth'
import { reservationsApi, RESERVATIONS_CHANGED, type ReservationResponse, type ReservationsPage } from '@/api/reservations'
import { useAuth } from './use-auth'

function useRefresh() {
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    window.addEventListener(RESERVATIONS_CHANGED, refresh); window.addEventListener('focus', refresh)
    const interval = window.setInterval(refresh, 15000)
    return () => { window.removeEventListener(RESERVATIONS_CHANGED, refresh); window.removeEventListener('focus', refresh); window.clearInterval(interval) }
  }, [refresh])
  return { revision, refresh }
}
export function useReservation(id: string) {
  const { user } = useAuth()
  const { revision, refresh } = useRefresh()
  const key = `${user?.id}:${id}`
  const [result, setResult] = useState<{ key: string; data?: ReservationResponse; error?: string; notFound?: boolean }>({ key: '' })
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    reservationsApi.get(id, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }) },
      (error: unknown) => {
        if (controller.signal.aborted) return
        const notFound = error instanceof ApiError && error.status === 404
        setResult((previous) => ({ key, data: !notFound && previous.key === key ? previous.data : undefined, notFound, error: error instanceof Error ? error.message : 'Não foi possível carregar a reserva.' }))
      },
    )
    return () => controller.abort()
  }, [id, key, user, revision])
  return { ...(result.key === key ? result : {}), loading: result.key !== key, refresh }
}
export function useReservations(page: number) {
  const { user } = useAuth()
  const { revision, refresh } = useRefresh()
  const key = `${user?.id}:${page}`
  const [result, setResult] = useState<{ key: string; data?: ReservationsPage; error?: string }>({ key: '' })
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    reservationsApi.list(page, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }) },
      (error: unknown) => { if (!controller.signal.aborted) setResult((previous) => ({ key, data: previous.key === key ? previous.data : undefined, error: error instanceof Error ? error.message : 'Não foi possível carregar suas reservas.' })) },
    )
    return () => controller.abort()
  }, [page, key, user, revision])
  return { ...(result.key === key ? result : {}), loading: result.key !== key, refresh }
}
