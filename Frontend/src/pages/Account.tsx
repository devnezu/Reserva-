import { useSearchParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Mail01Icon, Ticket01Icon, UserIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'
import { Button } from '@/components/ui/button'
import AccountLayout from '@/components/AccountLayout'
import { ProfilePhoto } from '@/components/ProfilePhoto'

export default function Account() {
  const { user } = useAuth()
  const goToAgenda = useGoToAgenda()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('secao') === 'eventos' ? 'eventos' : 'dados'
  return (
    <AccountLayout active={section}>
      {section === 'dados' && (
      <section id="seus-dados" aria-labelledby="account-data-title" className="scroll-mt-6 rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
        <h2 id="account-data-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Seus <span className="text-[#ED1C24]">dados</span></h2>
        <ProfilePhoto />
        <dl className="mt-8 grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-4 bg-[#f0eceb] px-5 py-4">
            <HugeiconsIcon icon={UserIcon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
            <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">Nome</dt><dd className="truncate text-base font-semibold">{user?.name}</dd></div>
          </div>
          <div className="flex items-center gap-4 bg-[#f0eceb] px-5 py-4">
            <HugeiconsIcon icon={Mail01Icon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
            <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">E-mail</dt><dd className="truncate text-base font-semibold">{user?.email}</dd></div>
          </div>
        </dl>
      </section>
      )}

      {section === 'eventos' && (
      <section id="meus-eventos" aria-labelledby="account-events-title" className="scroll-mt-6 rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
        <h2 id="account-events-title" className="text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Meus <span className="text-[#ED1C24]">eventos</span></h2>
        <div className="mt-8 flex flex-col items-center gap-4 bg-[#f0eceb] px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-[#ED1C24]/10 text-[#ED1C24]"><HugeiconsIcon icon={Ticket01Icon} size={26} /></span>
          <p className="text-lg font-extrabold uppercase">Você ainda não tem ingressos</p>
          <p className="max-w-sm text-sm text-neutral-600">Quando você comprar um ingresso, o evento aparece aqui.</p>
          <Button type="button" onClick={goToAgenda} className="mt-2 h-12 gap-4 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]">Ver próximos jogos <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} /></Button>
        </div>
      </section>
      )}
    </AccountLayout>
  )
}
