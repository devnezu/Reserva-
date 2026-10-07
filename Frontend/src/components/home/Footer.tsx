import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Globe02Icon, InstagramIcon, Linkedin01Icon } from '@hugeicons/core-free-icons'
import { useGoToAgenda } from '@/hooks/use-go-to-agenda'

const DRY_LINKS = [
  { label: 'Instagram da Dry Telecom', href: 'https://www.instagram.com/drytelecom/', icon: InstagramIcon },
  { label: 'LinkedIn da Dry', href: 'https://www.linkedin.com/company/drycompanybrasil/', icon: Linkedin01Icon },
  { label: 'Site da Dry Telecom', href: 'https://www.drytelecom.com.br/', icon: Globe02Icon },
]
const HEADING_CLASS = 'text-[11px] font-bold tracking-[0.18em] text-white/60 uppercase'
const LINK_CLASS = 'w-fit text-left text-base font-bold tracking-wide uppercase transition-colors hover:text-[#ED1C24] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

export default function Footer() {
  const goToAgenda = useGoToAgenda()
  return (
    <footer className="mt-auto text-white">
      <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="-mb-px block h-10 w-full fill-[#111111] sm:h-14">
        <path opacity="0.25" d="M0,30 C220,70 460,0 720,24 C980,48 1210,4 1440,34 L1440,80 L0,80 Z" />
        <path d="M0,52 C240,84 480,22 720,42 C960,62 1200,18 1440,46 L1440,80 L0,80 Z" />
      </svg>

      <div className="bg-[#111111] pt-8 sm:pt-10">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-12 sm:px-12 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-10">
        <div>
          <p className="text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] uppercase sm:text-4xl">Do clique<br /><span className="text-[#ED1C24]">à arquibancada.</span></p>
        </div>

        <nav aria-label="Rodapé" className="flex flex-col gap-4">
          <p className={HEADING_CLASS}>Navegação</p>
          <Link to="/" className={LINK_CLASS}>Início</Link>
          <button type="button" onClick={goToAgenda} className={LINK_CLASS}>Próximos eventos</button>
          <Link to="/conta" className={LINK_CLASS}>Minha conta</Link>
        </nav>

        <div>
          <p className={HEADING_CLASS}>Desafio técnico</p>
          <div className="mt-4 flex items-center gap-4">
            <img src="/DryLogoIco.webp" alt="" className="size-12 shrink-0 rounded-xl" />
            <p className="text-base leading-snug text-white/85">Projeto desenvolvido como desafio técnico para a <strong className="font-bold text-white">Dry Telecom</strong>.</p>
          </div>
          <ul className="mt-6 flex gap-3">
            {DRY_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (abre em nova aba)`} className="flex size-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-[#ED1C24] hover:ring-[#ED1C24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  <HugeiconsIcon icon={link.icon} size={22} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <p className="mx-auto w-full max-w-7xl px-6 py-6 text-xs text-white/60 sm:px-12">© 2026 Reservaí. Projeto demonstrativo.</p>
      </div>
      </div>
    </footer>
  )
}
