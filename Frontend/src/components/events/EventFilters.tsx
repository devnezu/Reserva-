import { EVENT_GENRES } from '@/api/events'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function EventFilters({ search, genre, onSearch, onGenre }: { search: string; genre: string; onSearch: (value: string) => void; onGenre: (value: string) => void }) {
  return <div className="flex flex-col gap-3 sm:flex-row"><label className="flex-1 text-sm font-semibold">Buscar por nome<Input type="search" value={search} onChange={(e) => onSearch(e.target.value)} maxLength={160} placeholder="Busque um evento" className="mt-2 h-12 rounded-xl bg-white" /></label><label className="text-sm font-semibold">Categoria<select value={genre} onChange={(e) => onGenre(e.target.value)} className="mt-2 block h-12 w-full rounded-xl border border-black/15 bg-white px-4 sm:w-44"><option value="">Todas</option>{Object.entries(EVENT_GENRES).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label></div>
}
export function EventPagination({ page, pages, busy, onPage }: { page: number; pages: number; busy: boolean; onPage: (value: number) => void }) {
  if (pages < 2) return null
  return <nav aria-label="Paginação dos eventos" className="mt-8 flex items-center justify-center gap-4"><Button variant="outline" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button><span className="text-sm">{page} / {pages}</span><Button variant="outline" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Próxima</Button></nav>
}
