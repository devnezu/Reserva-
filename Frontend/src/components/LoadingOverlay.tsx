import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { BRAND_MARK_PATHS } from '@/components/brand-mark'
import { cn } from '@/lib/utils'

// Carregamentos rápidos não chegam a mostrar a cortina; evita piscar a tela.
const SHOW_AFTER_MS = 180
const LOOP = { duration: 1.5, times: [0, 0.55, 0.85, 1], repeat: Infinity, repeatDelay: 0.2, ease: 'easeInOut' as const }

// Estado de carregamento padrão do app: desfoca a tela e desenha o símbolo da marca, como na troca de páginas.
export function LoadingOverlay({ label = 'Carregando' }: { label?: string }) {
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return createPortal(
    <div role="status" data-loading-overlay="" className={cn('fixed inset-0 z-[85] flex items-center justify-center bg-[#faf8f7]/55 backdrop-blur-md transition-opacity duration-200', visible ? 'opacity-100' : 'pointer-events-none opacity-0')}>
      <svg aria-hidden="true" viewBox="-4 -4 255 187" className="w-28 overflow-visible sm:w-36" fillRule="evenodd">
        {reducedMotion
          ? <path d={BRAND_MARK_PATHS[0]} fill="#ED1C24" />
          : <>
              <motion.path d={BRAND_MARK_PATHS[0]} fill="#ED1C24" initial={{ fillOpacity: 0 }} animate={{ fillOpacity: [0, 0, 1, 0] }} transition={LOOP} />
              <motion.path d={BRAND_MARK_PATHS[0]} fill="none" stroke="#ED1C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 1], opacity: [1, 1, 0, 0] }} transition={LOOP} />
            </>}
      </svg>
      <span className="sr-only">{label}…</span>
    </div>,
    document.body,
  )
}
