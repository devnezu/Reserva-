import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useEvents } from '@/hooks/use-events'
import { EventCard } from '@/components/events/EventCard'
import { EventFilters, EventPagination } from '@/components/events/EventFilters'
import { LoadingOverlay } from '@/components/LoadingOverlay'

export default function NextMatches() {
  const [query, setQuery] = useState({ q: '', genre: '', page: 1 })
  const { data, error, loading, refresh } = useEvents({ ...query, pageSize: 6 })
  return (
    <section id="proximos-jogos" tabIndex={-1} aria-labelledby="next-matches-title" className="mx-auto w-full max-w-7xl scroll-mt-6 px-6 py-20 outline-none sm:px-12 lg:py-24">
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        <span aria-hidden="true" className="h-[3px] max-w-48 flex-1 rounded-full bg-gradient-to-r from-transparent to-[#ED1C24]" />
        <h2 id="next-matches-title" className="text-center text-3xl leading-none font-extrabold tracking-[-0.03em] uppercase sm:text-5xl lg:text-6xl">Próximos <span className="text-[#ED1C24]">jogos</span></h2>
        <span aria-hidden="true" className="h-[3px] max-w-48 flex-1 rounded-full bg-gradient-to-l from-transparent to-[#ED1C24]" />
      </div>

      <div className="mt-10"><EventFilters search={query.q} genre={query.genre} onSearch={(q) => setQuery({ ...query, q, page: 1 })} onGenre={(genre) => setQuery({ ...query, genre, page: 1 })} /></div>
      {loading && !data && <LoadingOverlay label="Carregando eventos" />}
      {error && <div role="alert" className="py-12 text-center"><p>{error}</p><Button onClick={refresh} className="mt-4">Tentar novamente</Button></div>}
      {data && !error && <>{data.items.length ? <ul aria-busy={loading} className="mt-8 grid gap-8 lg:grid-cols-2">{data.items.map((event) => <li key={event.id}><EventCard event={event} /></li>)}</ul> : <p className="py-12 text-center text-neutral-600">Nenhum evento disponível para esses filtros.</p>}<EventPagination page={query.page} pages={data.totalPages} busy={loading} onPage={(page) => setQuery({ ...query, page })} /></>}
    </section>
  )
}
