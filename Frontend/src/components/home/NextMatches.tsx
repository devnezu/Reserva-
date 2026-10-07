import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { featuredMatch, matches } from './matches'

export default function NextMatches() {
  return (
    <section aria-labelledby="next-matches-title" className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-12 lg:py-24">
      <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em]"><span className="h-1.5 w-1.5 rounded-full bg-black" />Agenda</p>
      <h2 id="next-matches-title" className="text-4xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-5xl">Próximos jogos</h2>

      <ul className="mt-12 grid gap-8 md:grid-cols-2">
        {matches.map((match) => (
          <li key={match.id} className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white">
            <div className="relative">
              <img src={match.image} alt={`Escudos de ${match.home} e ${match.away}`} loading="lazy" className="aspect-[740/475] w-full object-cover" />
              {match.id === featuredMatch.id && <span className="absolute left-5 top-5 rounded-full bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Destaque</span>}
            </div>
            <div className="flex flex-1 flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{match.competition}</p>
                <h3 className="mt-2 text-2xl leading-tight font-semibold tracking-[-0.03em] uppercase">{match.home} <span className="font-light lowercase italic">x</span> {match.away}</h3>
                <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600"><HugeiconsIcon icon={Calendar03Icon} size={16} />{match.date} - {match.time}</p>
              </div>
              <Button asChild className="h-12 shrink-0 gap-4 rounded-full px-6 text-sm font-semibold">
                <Link to="/acesso">Comprar ingresso <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} /></Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
