import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, Logout01Icon, Ticket01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
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
  { id: 'eventos', label: 'Meus eventos', to: '/conta?secao=eventos', icon: Ticket01Icon, adminOnly: false },
  { id: 'admin', label: 'Gerenciar eventos', to: '/admin/eventos', icon: Calendar03Icon, adminOnly: true },
] as const

// Moldura das telas da conta: logo no topo, barra lateral à esquerda e o conteúdo à direita.
export default function AccountLayout({ active, children }: { active: AccountSection; children: ReactNode }) {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const sections = SECTIONS.filter((section) => !section.adminOnly || user?.role === 'admin')
  const current = SECTIONS.find((section) => section.id === active)

  async function leave() {
    setBusy(true)
    try { await logout(); notify.success('Você saiu da sua conta.') }
    catch { notify.error('Não foi possível sair. Tente novamente.') }
    finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-[#111111]">
      <header className="mx-auto w-full max-w-7xl px-6 pt-7 sm:px-12"><Brand /></header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-8 px-6 pt-8 pb-14 sm:px-12 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
        <aside aria-label="Menu da conta" className="self-start rounded-3xl border border-black/5 bg-white p-5 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.45)] lg:sticky lg:top-6">
          <div className="flex items-center gap-4 border-b border-black/10 pb-5">
            <UserAvatar user={user} className="size-14 bg-[#ED1C24] text-white ring-4 ring-[#ED1C24]/15" />
            <div className="min-w-0">
              <p className="truncate text-base leading-tight font-extrabold uppercase">{user?.name}</p>
              <p className="mt-0.5 truncate text-xs text-neutral-600">{user?.email}</p>
            </div>
          </div>
          <nav aria-label="Seções da conta" className="mt-4 space-y-1">
            {sections.map((section) => (
              <Link key={section.id} to={section.to} preventScrollReset aria-current={section.id === active ? 'page' : undefined} className={cn(ITEM_CLASS, section.id === active ? 'bg-[#ED1C24] text-white' : 'hover:bg-black/5')}><HugeiconsIcon icon={section.icon} size={18} />{section.label}</Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-black/10 pt-4">
            <button type="button" onClick={() => { void leave() }} disabled={busy} className={cn(ITEM_CLASS, 'text-[#ED1C24] hover:bg-[#ED1C24]/10')}><HugeiconsIcon icon={Logout01Icon} size={18} />{busy ? 'Saindo…' : 'Sair da conta'}</button>
          </div>
        </aside>

        <main className="min-w-0 space-y-8">
          <Breadcrumb>
            <BreadcrumbList className="text-neutral-600">
              <BreadcrumbItem><BreadcrumbLink asChild className="hover:text-[#ED1C24]"><Link to="/">Início</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>Minha conta</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage className="font-bold text-[#111111]">{current?.label}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {children}
        </main>
      </div>
    </div>
  )
}
