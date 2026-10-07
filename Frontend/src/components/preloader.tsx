import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  BRAND_MARK_PATHS,
  BRAND_MARK_VIEWBOX,
  BRAND_MARK_WIDTH,
  BRAND_MARK_HEIGHT,
} from '@/components/brand-mark'
import { cn } from '@/lib/utils'

const MIN_VISIBLE_MS = 2000
const COMPLETE_MS = 900
const HOLD_AT_100_MS = 350
const EXIT_DURATION_MS = 1500
const MAX_WAIT_MS = 15000
const WAVE_EDGE_PATH = 'M0,200 L0,86 C240,14 470,152 720,112 C965,73 1200,4 1440,72 L1440,200 Z'
type Phase = 'loading' | 'ready' | 'exiting' | 'done'

export function Preloader({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const progressRef = useRef(0)
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const start = performance.now()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let timeout = 0
    let cancelled = false
    let scheduled = false
    let completeFrom: { at: number; value: number } | null = null

    const tick = () => {
      if (cancelled) return
      const now = performance.now()
      let value: number
      if (completeFrom) {
        const k = reduce ? 1 : Math.min(1, (now - completeFrom.at) / COMPLETE_MS)
        value = completeFrom.value + (100 - completeFrom.value) * (1 - (1 - k) ** 3)
        if (k >= 1) {
          progressRef.current = 100
          setProgress(100)
          setPhase('ready')
          return
        }
      } else {
        value = Math.max(progressRef.current, Math.min(90, 90 * (1 - Math.exp(-(now - start) / 900))))
      }
      progressRef.current = value
      setProgress(value)
      raf = requestAnimationFrame(tick)
    }

    const finish = () => {
      if (cancelled || scheduled) return
      scheduled = true
      const wait = reduce ? 0 : Math.max(0, MIN_VISIBLE_MS - (performance.now() - start))
      timeout = window.setTimeout(() => {
        completeFrom = { at: performance.now(), value: progressRef.current }
      }, wait)
    }
    const resourcesReady = () => {
      // Font loading can settle after window.load; keep the final reveal stable.
      void document.fonts.ready.then(finish, finish)
    }

    raf = requestAnimationFrame(tick)
    if (document.readyState === 'complete') resourcesReady()
    else window.addEventListener('load', resourcesReady, { once: true })
    // A stalled resource must not trap the visitor behind the overlay forever.
    const fallback = window.setTimeout(finish, MAX_WAIT_MS)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
      window.clearTimeout(fallback)
      window.removeEventListener('load', resourcesReady)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'loading' && phase !== 'ready') return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [phase])

  useEffect(() => {
    if (phase !== 'ready' && phase !== 'exiting') return
    const delay = reducedMotion ? 0 : phase === 'ready' ? HOLD_AT_100_MS : EXIT_DURATION_MS
    const timeout = window.setTimeout(() => setPhase(phase === 'ready' ? 'exiting' : 'done'), delay)
    return () => window.clearTimeout(timeout)
  }, [phase, reducedMotion])

  useEffect(() => {
    if (phase === 'done') onComplete?.()
  }, [phase, onComplete])

  if (phase === 'done') return null

  const draw = Math.min(1, progress / 65)
  const fill = Math.max(0, Math.min(1, (progress - 55) / 45))
  const strokeOpacity = 1 - Math.max(0, Math.min(1, (progress - 84) / 16))
  const exiting = phase === 'exiting'

  return (
    <div role="status" aria-live="polite" aria-label="Carregando Reservaí" data-preloader="" className="fixed inset-0 z-[100] overflow-hidden">
      <span className="sr-only">Preparando o Reservaí. Aguarde um momento.</span>
      {[
        { color: '#fee2e2', delay: 260 },
        { color: '#ED1C24', delay: 130 },
        { color: '#faf8f7', delay: 0 },
      ].map(({ color, delay }) => (
        <div key={color} aria-hidden="true" className="absolute inset-0 transition-transform duration-[1100ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none" style={{ transform: exiting ? 'translateY(115%)' : 'translateY(0)', transitionDelay: reducedMotion ? '0ms' : `${delay}ms` }}>
          <div className="absolute inset-0" style={{ backgroundColor: color }} />
          <svg className="absolute inset-x-0 bottom-[calc(100%-1px)] h-[14vh] w-full" preserveAspectRatio="none" viewBox="0 0 1440 200"><path d={WAVE_EDGE_PATH} fill={color} /></svg>
          {delay === 0 && (
            <div className={cn('relative flex h-full w-full items-center justify-center px-6 transition-opacity duration-300 motion-reduce:transition-none', exiting ? 'opacity-0' : 'opacity-100')}>
              <svg className="w-[min(78vw,850px)] overflow-visible" fill="none" preserveAspectRatio="xMidYMid meet" viewBox={BRAND_MARK_VIEWBOX}>
                <defs><clipPath id={clipId}><rect x="0" width={BRAND_MARK_WIDTH} y={BRAND_MARK_HEIGHT * (1 - fill)} height={BRAND_MARK_HEIGHT * fill} /></clipPath></defs>
                <g clipPath={`url(#${clipId})`}>{BRAND_MARK_PATHS.map((d, index) => <path key={index} d={d} fill={index === 0 ? '#ED1C24' : '#1c1f23'} fillRule="evenodd" />)}</g>
                {BRAND_MARK_PATHS.map((d, index) => <path key={index} d={d} stroke="#ED1C24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} fillRule="evenodd" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - draw, opacity: strokeOpacity }} />)}
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
