import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, Cancel01Icon, Logout01Icon, Menu01Icon, Ticket01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import Brand from '@/components/Brand'
import { UserAvatar } from '@/components/UserAvatar'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

export type AccountSection = 'dados' | 'eventos' | 'admin'

const ITEM_CLASS = 'flex w-full items-center gap-3 rounded-full px-5 py-3 text-left text-sm font-bold tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ED1C24] disabled:opacity-50'
const SECTIONS = [
  { id: 'dados', label: 'Meus dados', to: '/conta', icon: UserCircleIcon, adminOnly: false },
  { id: 'eventos', label: 'Minhas reservas', to: '/conta?secao=eventos', icon: Ticket01Icon, adminOnly: false },
  { id: 'admin', label: 'Gerenciar eventos', to: '/admin/eventos', icon: Calendar03Icon, adminOnly: true },
] as const

// Moldura das telas da conta: logo no topo, menu da conta e o conteúdo.
// No desktop o menu é uma barra lateral à esquerda; no celular e no tablet abre pelo botão hambúrguer ao lado da logo.
// O título fica sempre no mesmo lugar, logo abaixo do caminho; `action` ocupa o canto direito da mesma linha.
// `trail` é o nome de uma página dentro da seção (ex.: "Sua reserva"): a seção vira link no caminho e `trail` fecha a trilha.
// `hideTitleOnMobile` esconde o título abaixo do desktop, onde o caminho já diz em que tela a pessoa está.
export default function AccountLayout({ active, title, action, trail, hideTitleOnMobile = false, children }: { active: AccountSection; title: ReactNode; action?: ReactNode; trail?: string; hideTitleOnMobile?: boolean; children: ReactNode }) {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const reducedMotion = useReducedMotion()
  const sections = SECTIONS.filter((section) => !section.adminOnly || user?.role === 'admin')
  const current = SECTIONS.find((section) => section.id === active)

  async function leave() {
    setBusy(true)
    try { await logout(); notify.success('Você saiu da sua conta.') }
    catch { notify.error('Não foi possível sair. Tente novamente.') }
    finally { setBusy(false) }
  }

  const links = sections.map((section) => (
    <Link key={section.id} to={section.to} preventScrollReset onClick={() => setMenuOpen(false)} aria-current={section.id === active ? 'page' : undefined} className={cn(ITEM_CLASS, section.id === active ? 'bg-[#ED1C24] text-white' : 'hover:bg-black/5')}><HugeiconsIcon icon={section.icon} size={18} />{section.label}</Link>
  ))
  const leaveButton = <button type="button" onClick={() => { void leave() }} disabled={busy} className={cn(ITEM_CLASS, 'text-[#ED1C24] hover:bg-[#ED1C24]/10')}><HugeiconsIcon icon={Logout01Icon} size={18} />{busy ? 'Saindo…' : 'Sair da conta'}</button>
  const crumbs = (
    <Breadcrumb>
      <BreadcrumbList className="text-neutral-600">
        <BreadcrumbItem><BreadcrumbLink asChild className="hover:text-[#ED1C24]"><Link to="/">Início</Link></BreadcrumbLink></BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>Minha conta</BreadcrumbItem>
        <BreadcrumbSeparator />
        {trail && current
          ? <><BreadcrumbItem><BreadcrumbLink asChild className="hover:text-[#ED1C24]"><Link to={current.to}>{current.label}</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage className="font-bold text-[#111111]">{trail}</BreadcrumbPage></BreadcrumbItem></>
          : <BreadcrumbItem><BreadcrumbPage className="font-bold text-[#111111]">{current?.label}</BreadcrumbPage></BreadcrumbItem>}
      </BreadcrumbList>
    </Breadcrumb>
  )

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-[#111111]">
      <header className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 pt-8 sm:px-12 sm:pt-10 lg:flex">
        <div className="col-start-2 flex"><Brand /></div>
        <button type="button" aria-label={menuOpen ? 'Fechar menu da conta' : 'Abrir menu da conta'} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((value) => !value)} className="col-start-3 flex size-11 items-center justify-center justify-self-end rounded-full transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ED1C24] lg:hidden">
          <HugeiconsIcon icon={menuOpen ? Cancel01Icon : Menu01Icon} size={28} />
        </button>
      </header>
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div id={menuId} initial={{ height: 0, opacity: reducedMotion ? 1 : 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden lg:hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pt-6 sm:px-12">
              <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3 border-b border-black/10 px-1 pb-4">
                  <UserAvatar user={user} className="size-11 bg-[#ED1C24] text-sm text-white" />
                  <div className="min-w-0">
                    <p className="truncate text-sm leading-tight font-extrabold uppercase">{user?.name}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-600">{user?.email}</p>
                  </div>
                </div>
                <nav aria-label="Seções da conta" className="mt-3 space-y-1">{links}</nav>
                <div className="mt-3 border-t border-black/10 pt-3">{leaveButton}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-6 px-6 pt-8 pb-16 sm:px-12 sm:pt-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10 lg:pt-14">
        <div className="lg:hidden [&_ol]:justify-center">{crumbs}</div>

        <aside aria-label="Menu da conta" className="hidden self-start rounded-3xl border border-black/5 bg-white p-5 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.45)] lg:sticky lg:top-6 lg:block">
          <div className="flex items-center gap-4 border-b border-black/10 pb-5">
            <UserAvatar user={user} className="size-14 bg-[#ED1C24] text-white ring-4 ring-[#ED1C24]/15" />
            <div className="min-w-0">
              <p className="truncate text-base leading-tight font-extrabold uppercase">{user?.name}</p>
              <p className="mt-0.5 truncate text-xs text-neutral-600">{user?.email}</p>
            </div>
          </div>
          <nav aria-label="Seções da conta" className="mt-4 space-y-1">{links}</nav>
          <div className="mt-4 border-t border-black/10 pt-4">{leaveButton}</div>
        </aside>

        <main className="min-w-0 space-y-6 lg:space-y-8">
          <div className="hidden lg:block">{crumbs}</div>
          <div className={cn('flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-4', hideTitleOnMobile && 'max-lg:sr-only')}>
            <h1 className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">{title}</h1>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
