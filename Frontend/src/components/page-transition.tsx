import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BRAND_MARK_PATHS } from '@/components/brand-mark'

export function PageTransition({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const [active, setActive] = useState(false)
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname
    const betweenHomeAndAccess = (previous === '/' && pathname === '/acesso')
      || (previous === '/acesso' && pathname === '/')

    if (!betweenHomeAndAccess || disabled || reducedMotion) {
      setActive(false)
      return
    }
    setActive(true)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const timer = window.setTimeout(() => setActive(false), 1100)
    return () => window.clearTimeout(timer)
  }, [pathname, disabled, reducedMotion])

  useLayoutEffect(() => {
    if (!active) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [active])

  return (
    <>
      <div inert={disabled || active} aria-hidden={disabled || active || undefined}>{children}</div>
      <AnimatePresence mode="wait">
        {active && (
          <motion.div key={pathname} role="status" aria-label="Carregando página" data-page-loader="" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-[#faf8f7]">
            <svg aria-hidden="true" viewBox="-4 -4 255 187" className="w-28 overflow-visible sm:w-36" fillRule="evenodd">
              <motion.path d={BRAND_MARK_PATHS[0]} fill="#ED1C24" initial={{ fillOpacity: 0 }} animate={{ fillOpacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }} />
              <motion.path d={BRAND_MARK_PATHS[0]} fill="none" stroke="#ED1C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ pathLength: { duration: 0.65, ease: 'easeInOut' }, opacity: { duration: 0.2, delay: 0.8 } }} />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
