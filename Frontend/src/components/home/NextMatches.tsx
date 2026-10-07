import { TicketAccessLink } from './TicketAccessLink'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { matches } from './matches'

export default function NextMatches() {
  return (
    <section id="proximos-jogos" tabIndex={-1} aria-labelledby="next-matches-title" className="mx-auto w-full max-w-7xl scroll-mt-6 px-6 py-20 outline-none sm:px-12 lg:py-24">
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <span aria-hidden="true" className="h-[3px] max-w-48 flex-1 rounded-full bg-gradient-to-r from-transparent to-[#ED1C24]" />
        <h2 id="next-matches-title" className="text-center text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-5xl lg:text-6xl">Próximos <span className="text-[#ED1C24]">jogos</span></h2>
        <span aria-hidden="true" className="h-[3px] max-w-48 flex-1 rounded-full bg-gradient-to-l from-transparent to-[#ED1C24]" />
      </div>

      <ul className="mt-12 grid gap-8 lg:grid-cols-2">
        {matches.map((match) => (
          <li key={match.id} className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white">
            <img src={match.image} alt={`Escudos de ${match.home} e ${match.away}`} loading="lazy" className="aspect-[740/475] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <img src="/brasileirao-2026.svg" alt={match.competition} className="h-14 w-auto shrink-0 brightness-0 sm:h-16" />
                <div className="min-w-0">
                  <h3 className="text-sm leading-tight font-semibold tracking-[-0.03em] whitespace-nowrap uppercase min-[420px]:text-base sm:text-2xl lg:text-lg xl:text-[22px]">{match.home} <span className="font-light lowercase italic">x</span> {match.away}</h3>
                  <p className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#ED1C24]/10 px-3.5 py-1.5 text-sm font-bold text-[#ED1C24] sm:text-base"><HugeiconsIcon icon={Calendar03Icon} size={18} />{match.date} - {match.time}</p>
                </div>
              </div>
              <Button asChild className="h-12 w-full gap-4 rounded-full bg-[#ED1C24] px-6 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 transition-transform duration-200 hover:scale-[1.02] hover:bg-[#d0161d] active:scale-100">
                <TicketAccessLink>Comprar ingresso <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} /></TicketAccessLink>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
