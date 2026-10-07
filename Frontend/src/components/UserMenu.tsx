import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowRight01Icon, Cancel01Icon, Logout01Icon, Menu01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/UserAvatar'

const ITEM_CLASS = 'flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-bold tracking-wide uppercase transition-colors hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none disabled:opacity-50'
const SECTION_CLASS = 'flex w-full items-center justify-between gap-4 border-b border-white/25 py-5 text-left text-4xl leading-none font-extrabold tracking-[-0.03em] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
const ACTION_CLASS = 'flex items-center gap-3 py-3 text-base font-bold tracking-wide uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-50'

// No desktop é um seletor que expande para baixo; no celular vira um menu hambúrguer em tela cheia.
export default function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const sheetId = useId()
  const reducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const goToAgenda = useGoToAgenda()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!sheetOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSheetOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [sheetOpen])

  async function leave() {
    setBusy(true)
    try { await logout(); notify.success('Você saiu da sua conta.') }
    catch { notify.error('Não foi possível sair. Tente novamente.') }
    finally { setBusy(false); setOpen(false); setSheetOpen(false) }
  }

  function goHome() {
    setSheetOpen(false)
    if (pathname !== '/') void navigate('/')
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
  }

  function openAgenda() {
    setSheetOpen(false)
    goToAgenda()
  }

  return (
    <>
      <div ref={rootRef} className={cn('relative hidden', pathname !== '/conta' && 'md:block')}>
        <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} className={cn('flex h-11 max-w-[16rem] items-center gap-2 px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white', open ? 'rounded-t-[22px] bg-white text-[#111111]' : 'rounded-[22px] bg-white/15 text-white ring-1 ring-white/35 backdrop-blur-sm hover:bg-white/25')}>
          <UserAvatar user={user} className="size-7 text-xs ring-1 ring-white/35" />
          <span className="truncate">Olá, {user?.name}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} className={cn('shrink-0 transition-transform duration-200', open && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div id={menuId} role="menu" initial={{ height: 0, opacity: reducedMotion ? 1 : 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute top-full right-0 z-30 w-52 min-w-full overflow-hidden rounded-b-[22px] rounded-tl-[22px] bg-white text-[#111111] shadow-[0_20px_45px_-18px_rgba(0,0,0,0.45)]">
              <div className="border-t border-black/10 py-2">
                <Link role="menuitem" to="/conta" onClick={() => setOpen(false)} className={ITEM_CLASS}><HugeiconsIcon icon={UserCircleIcon} size={18} />Ir para conta</Link>
                <button role="menuitem" type="button" onClick={() => { void leave() }} disabled={busy} className={cn(ITEM_CLASS, 'text-[#ED1C24]')}><HugeiconsIcon icon={Logout01Icon} size={18} />{busy ? 'Saindo…' : 'Sair'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button type="button" aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={sheetOpen} aria-controls={sheetId} onClick={() => setSheetOpen(true)} className="flex size-11 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden">
        <HugeiconsIcon icon={Menu01Icon} size={28} />
      </button>
      {createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <motion.div id={sheetId} role="dialog" aria-modal="true" aria-label="Menu" initial={reducedMotion ? { opacity: 0 } : { x: '100%' }} animate={reducedMotion ? { opacity: 1 } : { x: 0 }} exit={reducedMotion ? { opacity: 0 } : { x: '100%' }} transition={{ duration: reducedMotion ? 0.01 : 0.38, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-[#ED1C24] px-6 pt-7 pb-10 text-white md:hidden">
              <div className="flex justify-end">
                <button ref={closeRef} type="button" aria-label="Fechar menu" onClick={() => setSheetOpen(false)} className="flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <HugeiconsIcon icon={Cancel01Icon} size={28} />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <UserAvatar user={user} className="size-20 text-2xl ring-4 ring-white/35" />
                <div className="min-w-0">
                  <p className="truncate text-2xl leading-tight font-extrabold tracking-[-0.03em] uppercase">Olá, {user?.name}</p>
                  <p className="mt-1 truncate text-sm text-white/85">{user?.email}</p>
                </div>
              </div>

              <nav aria-label="Seções" className="mt-10 border-t border-white/25">
                <button type="button" onClick={goHome} className={SECTION_CLASS}>Início <HugeiconsIcon icon={ArrowRight01Icon} size={28} /></button>
                <button type="button" onClick={openAgenda} className={SECTION_CLASS}>Agenda <HugeiconsIcon icon={ArrowRight01Icon} size={28} /></button>
              </nav>

              <div className="mt-auto pt-10">
                <Link to="/conta" onClick={() => setSheetOpen(false)} className={ACTION_CLASS}><HugeiconsIcon icon={UserCircleIcon} size={22} />Ir para conta</Link>
                <button type="button" onClick={() => { void leave() }} disabled={busy} className={ACTION_CLASS}><HugeiconsIcon icon={Logout01Icon} size={22} />{busy ? 'Saindo…' : 'Sair'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
