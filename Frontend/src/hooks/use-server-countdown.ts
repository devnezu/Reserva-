import { useEffect, useState } from 'react'

// Anchor to server time + monotonic elapsed time, independent of the device's
// wall clock and of whether a background tab throttles its intervals.
export function useServerCountdown(expiresAt: number, serverTime: number, enabled: boolean) {
  const [clock, setClock] = useState<{ serverTime: number; elapsed: number }>({ serverTime, elapsed: 0 })
  useEffect(() => {
    if (!enabled) return
    const started = performance.now()
    const tick = () => setClock({ serverTime, elapsed: performance.now() - started })
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [expiresAt, serverTime, enabled])
  const remaining = Math.max(0, Math.ceil((expiresAt - serverTime - (clock.serverTime === serverTime ? clock.elapsed : 0)) / 1000))
  return { remaining, label: `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}` }
}
