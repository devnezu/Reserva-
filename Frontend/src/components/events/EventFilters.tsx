import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, FilterHorizontalIcon, Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { EVENT_GENRES } from '@/api/events'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const GENRE_OPTIONS = [['', 'Todas'], ...Object.entries(EVENT_GENRES)] as const

// Botão que expande para baixo com as categorias, no mesmo estilo do seletor da navbar.
function GenreSelect({ genre, onGenre }: { genre: string; onGenre: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const reducedMotion = useReducedMotion()
  const current = GENRE_OPTIONS.find(([value]) => value === genre)?.[1] ?? 'Todas'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)} className={cn('flex h-14 w-full items-center justify-between gap-3 border bg-white px-6 text-sm font-bold tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ED1C24] lg:w-60', open ? 'rounded-t-[28px] border-[#ED1C24] border-b-transparent' : 'rounded-[28px] border-black/10 hover:border-[#ED1C24]', genre && 'text-[#ED1C24]')}>
        <span className="flex min-w-0 items-center gap-3"><HugeiconsIcon icon={FilterHorizontalIcon} size={20} className="shrink-0" /><span className="truncate">{genre ? current : 'Categoria'}</span></span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={18} className={cn('shrink-0 text-[#111111] transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul id={listId} role="listbox" aria-label="Categoria" initial={{ height: 0, opacity: reducedMotion ? 1 : 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-x-0 top-full z-30 overflow-hidden rounded-b-[28px] border border-t-0 border-[#ED1C24] bg-white shadow-[0_20px_45px_-18px_rgba(0,0,0,0.45)]">
            {GENRE_OPTIONS.map(([value, title]) => (
              <li key={value || 'all'} role="option" aria-selected={genre === value}>
                <button type="button" onClick={() => { onGenre(value); setOpen(false) }} className={cn('flex w-full items-center justify-between gap-3 px-6 py-3 text-left text-sm font-bold tracking-wide uppercase transition-colors hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none', genre === value && 'text-[#ED1C24]')}>
                  {title}{genre === value && <HugeiconsIcon icon={Tick02Icon} size={18} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function EventFilters({ search, genre, onSearch, onGenre, categories = 'chips' }: { search: string; genre: string; onSearch: (value: string) => void; onGenre: (value: string) => void; categories?: 'chips' | 'select' }) {
  const searchId = useId()
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-center', categories === 'chips' && 'lg:justify-between')}>
      <div className={cn('relative w-full', categories === 'chips' ? 'lg:max-w-md' : 'lg:flex-1')}>
        <label htmlFor={searchId} className="sr-only">Buscar evento por nome</label>
        <HugeiconsIcon icon={Search01Icon} size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-6 z-10 -translate-y-1/2 text-neutral-500" />
        <Input id={searchId} type="search" value={search} onChange={(e) => onSearch(e.target.value)} maxLength={160} placeholder="Busque um evento" className="h-14 rounded-full border-black/10 bg-white pr-6 pl-14 text-base font-semibold shadow-none placeholder:font-normal placeholder:text-neutral-500 focus-visible:border-[#ED1C24] focus-visible:ring-[#ED1C24] md:text-base" />
      </div>
      {categories === 'select' ? <GenreSelect genre={genre} onGenre={onGenre} /> : (
      <div role="group" aria-label="Filtrar por categoria" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 lg:justify-end">
        {GENRE_OPTIONS.map(([value, title]) => (
          <button key={value || 'all'} type="button" aria-pressed={genre === value} onClick={() => onGenre(value)} className={cn('h-11 shrink-0 rounded-full px-5 text-sm font-bold tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ED1C24]', genre === value ? 'bg-[#ED1C24] text-white shadow-lg shadow-[#ED1C24]/30' : 'border border-black/10 bg-white text-[#111111] hover:border-[#ED1C24] hover:text-[#ED1C24]')}>{title}</button>
        ))}
      </div>
      )}
    </div>
  )
}
export function EventPagination({ page, pages, busy, onPage }: { page: number; pages: number; busy: boolean; onPage: (value: number) => void }) {
  if (pages < 2 && page <= 1) return null
  return <nav aria-label="Paginação dos eventos" className="mt-8 flex items-center justify-center gap-4"><Button variant="outline" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button><span className="text-sm">{page} / {pages}</span><Button variant="outline" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Próxima</Button></nav>
}
