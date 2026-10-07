import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, Mail01Icon, LockPasswordIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Brand from '@/components/Brand'
import { notify } from '@/lib/notify'
import { useAuth } from '@/hooks/use-auth'

const WIPE_MS = 1500
const WIPE_TIMES = [0, 0.5, 0.6, 1]

export default function Access() {
  const { login: signIn, status } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const login = searchParams.get('modo') === 'entrar'
  const [busy, setBusy] = useState(false)
  const [wipe, setWipe] = useState<{ phase: 'down' | 'up'; title: string; text: string; top: number; target: number } | null>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const promptTitle = login ? 'Ainda não tem uma conta?' : 'Bem-vindo de volta!'
  const promptText = login ? 'Faça parte. Novas memórias estão esperando por você.' : 'Acesse sua conta e continue de onde parou.'
  const submitting = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const transition = { duration: reducedMotion ? 0 : 0.7, ease: [0.76, 0, 0.24, 1] as const }

  function toggleMode() {
    if (submitting.current) return
    setSearchParams(login ? {} : { modo: 'entrar' }, { replace: true })
  }
  // No celular a troca de modo "derrete" o topo: o vermelho escorre levando o texto, cobre a tela e recolhe.
  function wipeToggle() {
    if (submitting.current || wipe) return
    if (reducedMotion) { toggleMode(); return }
    const top = promptRef.current?.getBoundingClientRect().top ?? 100
    setWipe({ phase: 'down', title: promptTitle, text: promptText, top, target: Math.max(top + 120, window.innerHeight * 0.4) })
    window.setTimeout(() => {
      setWipe((current) => current && { ...current, phase: 'up' })
      toggleMode()
    }, WIPE_MS * WIPE_TIMES[1] + 60)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!login) { notify.info('O cadastro estará disponível em breve.'); return }
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await signIn(String(data.get('email') ?? ''), String(data.get('password') ?? ''))
      form.reset()
      notify.success('Acesso confirmado.')
    } catch (error) {
      notify.error(error instanceof Error && error.name !== 'TypeError' ? error.message : 'Não foi possível conectar. Tente novamente.')
    } finally { submitting.current = false; setBusy(false) }
  }

  const from = (location.state as { from?: string } | null)?.from
  if (status === 'authenticated') return <Navigate to={typeof from === 'string' && /^\/conta(?:[?#]|$)/.test(from) ? from : '/conta'} replace />

  const panelContent = (
    <>
      <Brand light />
      <div className="my-10 w-full max-w-xs md:my-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={login ? 'register' : 'login'} initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -12 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
            <h2 className="text-4xl leading-[0.95] font-extrabold tracking-[-0.03em] uppercase md:text-3xl lg:text-4xl xl:text-[40px] 2xl:text-5xl">{login ? <>Ainda não<br />tem uma<br />conta?</> : <>Bem-vindo<br />de volta!</>}</h2>
            <p className="mt-4 text-base leading-relaxed text-white/90 lg:text-lg">{login ? 'Faça parte. Novas memórias estão esperando por você.' : 'Acesse sua conta e continue de onde parou.'}</p>
          </motion.div>
        </AnimatePresence>
        <Button type="button" onClick={toggleMode} disabled={busy} variant="outline" className="mt-8 h-12 w-full rounded-full border-white/70 bg-transparent text-sm font-bold tracking-wide text-white shadow-none hover:bg-white hover:text-black">
          {login ? 'CRIAR CONTA' : 'ENTRAR'}
        </Button>
      </div>
      <img src="/DryLogoIco.webp" alt="Dry" className="size-10 rounded-lg" />
    </>
  )

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#faf8f7] text-black md:h-svh md:min-h-[680px]">
      <aside className="relative flex flex-col items-center bg-[#ED1C24] px-8 pt-8 pb-20 text-center text-white md:hidden">
        <Brand light />
        <div ref={promptRef} className={wipe?.phase === 'down' ? 'invisible' : undefined}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={login ? 'register' : 'login'} initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }} transition={{ duration: reducedMotion ? 0 : 0.2 }} className="mt-8">
              <h2 className="text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] text-balance uppercase">{promptTitle}</h2>
              <p className="mt-3 text-base leading-relaxed text-white/90">{promptText}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <Button type="button" onClick={wipeToggle} disabled={busy} className="mt-6 h-12 min-w-[200px] rounded-full bg-white px-8 text-sm font-bold tracking-wide text-[#ED1C24] shadow-lg shadow-black/20 hover:bg-white/90">
          {login ? 'CRIAR CONTA' : 'ENTRAR'}
        </Button>
        <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px h-10 w-full fill-[#faf8f7]">
          <path opacity="0.45" d="M0,30 C220,70 460,0 720,24 C980,48 1210,4 1440,34 L1440,80 L0,80 Z" />
          <path d="M0,52 C240,84 480,22 720,42 C960,62 1200,18 1440,46 L1440,80 L0,80 Z" />
        </svg>
      </aside>
      {wipe && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden md:hidden">
          <motion.div initial={{ y: '-125%' }} animate={{ y: ['-125%', '0%', '0%', '-125%'] }} transition={{ duration: WIPE_MS / 1000, times: WIPE_TIMES, ease: ['easeIn', 'linear', 'easeInOut'] }} onAnimationComplete={() => setWipe(null)} className="absolute inset-x-0 top-0 h-full bg-[#ED1C24]">
            <motion.svg viewBox="0 0 1440 160" preserveAspectRatio="none" initial={{ scaleY: 0.5 }} animate={{ scaleY: [0.5, 1.5, 1, 0.6] }} transition={{ duration: WIPE_MS / 1000, times: WIPE_TIMES, ease: 'easeInOut' }} className="absolute inset-x-0 top-full -mt-px h-24 w-full origin-top fill-[#ED1C24]">
              <path d="M0,0 L1440,0 L1440,60 C1380,60 1370,150 1320,150 C1270,150 1265,70 1200,70 C1140,70 1130,110 1080,110 C1030,110 1020,50 950,50 C880,50 875,140 820,140 C765,140 760,65 690,65 C620,65 615,120 560,120 C505,120 500,55 430,55 C360,55 355,155 300,155 C245,155 240,75 170,75 C110,75 100,115 60,115 C30,115 20,60 0,60 Z" />
            </motion.svg>
          </motion.div>
          <motion.div initial={{ y: wipe.top, opacity: 1, scaleY: 1 }} animate={{ y: [wipe.top, wipe.target, wipe.target, wipe.target - 60], opacity: [1, 1, 1, 0], scaleY: [1, 1.18, 1, 1] }} transition={{ duration: WIPE_MS / 1000, times: WIPE_TIMES, ease: ['easeIn', 'linear', 'easeOut'], opacity: { duration: WIPE_MS / 1000, times: [0, 0.5, 0.6, 0.74] } }} className="absolute inset-x-0 top-0 origin-top px-8 pt-8 text-center text-white">
            <p className="text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] text-balance uppercase">{wipe.title}</p>
            <p className="mt-3 text-base leading-relaxed text-white/90">{wipe.text}</p>
          </motion.div>
        </div>
      )}
      <motion.aside initial={false} animate={{ left: login ? '66.666667%' : '0%' }} transition={transition} className="absolute inset-y-0 z-20 hidden w-1/3 flex-col items-start justify-between bg-[#ED1C24] px-8 py-12 text-white md:flex lg:px-14 lg:py-16 xl:px-20">
        {panelContent}
      </motion.aside>

      <motion.section initial={false} animate={{ left: login ? '0%' : '33.333333%' }} transition={transition} className="flex min-h-[560px] flex-col justify-center px-6 py-12 md:absolute md:inset-y-0 md:w-2/3 md:px-12 lg:px-20">
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => headingRef.current?.focus()}>
          <motion.div key={login ? 'login-form' : 'register-form'} initial={wipe ? { opacity: 0, y: -140 } : { opacity: 0, x: reducedMotion ? 0 : login ? -35 : 35 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={wipe ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, x: reducedMotion ? 0 : login ? 35 : -35 }} transition={wipe ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] } : { duration: reducedMotion ? 0 : 0.25 }} className="mx-auto w-full max-w-2xl">
            <div className="mb-10 text-center">
              <h1 ref={headingRef} tabIndex={-1} className="text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] text-balance uppercase outline-none sm:text-4xl lg:text-[44px] xl:text-6xl">{login ? 'Acesse sua' : 'Crie sua'} <span className="text-[#ED1C24]">conta</span></h1>
              <p className="mt-4 text-base text-neutral-700 sm:text-lg">{login ? 'Entre para viver sua próxima experiência' : 'Preencha seus dados e venha viver o novo'}</p>
            </div>
            <form onSubmit={submit} className="mx-auto max-w-[420px] space-y-3">
              {!login && <div className="relative"><label className="sr-only" htmlFor="name">Nome completo</label><HugeiconsIcon icon={UserIcon} size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-neutral-500" /><Input id="name" name="name" placeholder="Nome completo" autoComplete="name" required minLength={2} className="h-14 rounded-none border-0 bg-[#f0eceb] pl-14 text-base shadow-none md:text-base placeholder:text-neutral-500" /></div>}
              <div className="relative"><label className="sr-only" htmlFor="email">E-mail</label><HugeiconsIcon icon={Mail01Icon} size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-neutral-500" /><Input id="email" name="email" type="email" placeholder="E-mail" autoComplete="email" required className="h-14 rounded-none border-0 bg-[#f0eceb] pl-14 text-base shadow-none md:text-base placeholder:text-neutral-500" /></div>
              <div className="relative"><label className="sr-only" htmlFor="password">Senha</label><HugeiconsIcon icon={LockPasswordIcon} size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-neutral-500" /><Input id="password" name="password" type="password" placeholder={login ? 'Senha' : 'Senha (mínimo de 8 caracteres)'} autoComplete={login ? 'current-password' : 'new-password'} minLength={login ? undefined : 8} required maxLength={128} className="h-14 rounded-none border-0 bg-[#f0eceb] pl-14 text-base shadow-none md:text-base placeholder:text-neutral-500" /></div>
              <div className="pt-7 text-center"><Button type="submit" disabled={busy || (login && status === 'loading')} className="h-14 min-w-[220px] rounded-full bg-[#ED1C24] px-10 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]">{busy ? 'ENTRANDO…' : login ? 'ENTRAR' : 'CADASTRAR'}</Button></div>
            </form>
          </motion.div>
        </AnimatePresence>
        <img src="/DryLogoIco.webp" alt="Dry" className="mx-auto mt-10 size-10 rounded-lg md:hidden" />
      </motion.section>
    </main>
  )
}
