import { useRef, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, Mail01Icon, LockPasswordIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Brand from '@/components/Brand'
import { notify } from '@/lib/notify'

export default function Access() {
  const [searchParams, setSearchParams] = useSearchParams()
  const login = searchParams.get('modo') === 'entrar'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const transition = { duration: reducedMotion ? 0 : 0.7, ease: [0.76, 0, 0.24, 1] as const }

  function toggleMode() {
    setSearchParams(login ? {} : { modo: 'entrar' }, { replace: true })
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login) notify.info('O login estará disponível em breve.')
    else notify.info('O cadastro estará disponível em breve.')
  }

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
        <Button type="button" onClick={toggleMode} variant="outline" className="mt-8 h-12 w-full rounded-full border-white/70 bg-transparent text-sm font-bold tracking-wide text-white shadow-none hover:bg-white hover:text-black">
          {login ? 'CRIAR CONTA' : 'ENTRAR'}
        </Button>
      </div>
      <img src="/DryLogoIco.webp" alt="Dry" className="size-10 rounded-lg" />
    </>
  )

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#faf8f7] text-black md:h-svh md:min-h-[680px]">
      <aside className="flex flex-col items-start justify-between bg-[#ED1C24] px-8 py-8 text-white md:hidden">{panelContent}</aside>
      <motion.aside initial={false} animate={{ left: login ? '66.666667%' : '0%' }} transition={transition} className="absolute inset-y-0 z-20 hidden w-1/3 flex-col items-start justify-between bg-[#ED1C24] px-8 py-12 text-white md:flex lg:px-14 lg:py-16 xl:px-20">
        {panelContent}
      </motion.aside>

      <motion.section initial={false} animate={{ left: login ? '0%' : '33.333333%' }} transition={transition} className="flex min-h-[560px] flex-col justify-center px-6 py-12 md:absolute md:inset-y-0 md:w-2/3 md:px-12 lg:px-20">
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => headingRef.current?.focus()}>
          <motion.div key={login ? 'login-form' : 'register-form'} initial={{ opacity: 0, x: reducedMotion ? 0 : login ? -35 : 35 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : login ? 35 : -35 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="mx-auto w-full max-w-2xl">
            <div className="mb-10 text-center">
              <h1 ref={headingRef} tabIndex={-1} className="text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] text-balance uppercase outline-none sm:text-4xl lg:text-[44px] xl:text-6xl">{login ? 'Acesse sua' : 'Crie sua'} <span className="text-[#ED1C24]">conta</span></h1>
              <p className="mt-4 text-base text-neutral-700 sm:text-lg">{login ? 'Entre para viver sua próxima experiência' : 'Preencha seus dados e venha viver o novo'}</p>
            </div>
            <form onSubmit={submit} className="mx-auto max-w-[420px] space-y-3">
              {!login && <div className="relative"><label className="sr-only" htmlFor="name">Nome completo</label><HugeiconsIcon icon={UserIcon} size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-neutral-500" /><Input id="name" name="name" placeholder="Nome completo" autoComplete="name" required minLength={2} className="h-14 rounded-none border-0 bg-[#f0eceb] pl-14 text-base shadow-none md:text-base placeholder:text-neutral-500" /></div>}
              <div className="relative"><label className="sr-only" htmlFor="email">E-mail</label><HugeiconsIcon icon={Mail01Icon} size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-neutral-500" /><Input id="email" name="email" type="email" placeholder="E-mail" autoComplete="email" required className="h-14 rounded-none border-0 bg-[#f0eceb] pl-14 text-base shadow-none md:text-base placeholder:text-neutral-500" /></div>
              <div className="relative"><label className="sr-only" htmlFor="password">Senha</label><HugeiconsIcon icon={LockPasswordIcon} size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-neutral-500" /><Input id="password" name="password" type="password" placeholder={login ? 'Senha' : 'Senha (mínimo de 8 caracteres)'} autoComplete={login ? 'current-password' : 'new-password'} minLength={login ? undefined : 8} required className="h-14 rounded-none border-0 bg-[#f0eceb] pl-14 text-base shadow-none md:text-base placeholder:text-neutral-500" /></div>
              <div className="pt-7 text-center"><Button type="submit" className="h-14 min-w-[220px] rounded-full bg-[#ED1C24] px-10 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]">{login ? 'ENTRAR' : 'CADASTRAR'}</Button></div>
            </form>
          </motion.div>
        </AnimatePresence>
      </motion.section>
    </main>
  )
}
