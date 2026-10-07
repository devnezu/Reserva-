import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-black/10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:px-12">
        <p>Menos espera. Mais momentos.</p>
        <Link to="/acesso" className="flex w-fit items-center gap-3 text-black">Encontre sua próxima experiência <HugeiconsIcon icon={ArrowRight01Icon} size={16} /></Link>
      </div>
    </footer>
  )
}
