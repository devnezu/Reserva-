import { useSearchParams } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Mail01Icon, ShieldUserIcon, UserIcon } from '@hugeicons/core-free-icons'
import { useAuth } from '@/hooks/use-auth'
import AccountLayout from '@/components/AccountLayout'
import { ProfilePhoto } from '@/components/ProfilePhoto'
import { cn } from '@/lib/utils'
import { MyReservations } from '@/components/reservations/MyReservations'

export default function Account() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('secao') === 'eventos' ? 'eventos' : 'dados'
  const fields = [
    { label: 'Nome', value: user?.name, icon: UserIcon, wide: false },
    { label: 'Cargo', value: user?.role === 'admin' ? 'Administrador' : 'Usuário', icon: ShieldUserIcon, wide: false },
    { label: 'E-mail', value: user?.email, icon: Mail01Icon, wide: true },
  ]
  return (
    <AccountLayout active={section} hideTitleOnMobile title={section === 'dados' ? <>Seus <span className="text-[#ED1C24]">dados</span></> : <>Seus <span className="text-[#ED1C24]">ingressos</span></>}>
      {section === 'dados' && (
      <section id="seus-dados" aria-label="Seus dados" className="scroll-mt-6 rounded-3xl border border-black/10 bg-white p-6 sm:p-8 [&>div:first-child]:mt-0">
        <ProfilePhoto />
        <dl className="mt-8 grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className={cn('flex items-center gap-4 bg-[#f0eceb] px-5 py-4', field.wide && 'md:col-span-2')}>
              <HugeiconsIcon icon={field.icon} size={20} aria-hidden="true" className="shrink-0 text-neutral-500" />
              <div className="min-w-0"><dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">{field.label}</dt><dd className="truncate text-base font-semibold">{field.value}</dd></div>
            </div>
          ))}
        </dl>
      </section>
      )}

      {section === 'eventos' && <MyReservations />}
    </AccountLayout>
  )
}
