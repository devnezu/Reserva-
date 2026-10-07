import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { featuredMatch } from './matches'

export default function Hero() {
  const reducedMotion = useReducedMotion()
  return (
    <section aria-labelledby="hero-title" className="relative flex flex-col xl:min-h-[max(480px,33.8vw)] xl:justify-center">
      <img src="/backgroundHome.png" alt="Três jogadores do São Paulo sorrindo com a camisa branca do clube" className="h-64 w-full object-cover object-right sm:h-80 lg:h-[420px] xl:absolute xl:inset-0 xl:h-full" />
      <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-[#4d0408]/80 via-[#4d0408]/25 via-40% to-transparent xl:block" />

      <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative mx-auto w-full max-w-7xl px-6 py-14 text-white sm:px-12 xl:pb-8 xl:pt-28">
        <h1 id="hero-title" className="max-w-md text-5xl leading-[0.95] font-extrabold tracking-[-0.04em] uppercase drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] sm:text-6xl xl:text-5xl 2xl:max-w-xl 2xl:text-7xl">{featuredMatch.home}<br /><span className="font-light lowercase italic">x</span> {featuredMatch.away}</h1>
        <div className="mt-6 flex items-center gap-4">
          <img src="/brasileirao-2026.svg" alt={featuredMatch.competition} className="h-14 w-auto shrink-0 2xl:h-16" />
          <p className="inline-flex items-center gap-2.5 rounded-full bg-white/15 px-4 py-2 text-base font-bold ring-1 ring-white/35 backdrop-blur-sm sm:text-lg"><HugeiconsIcon icon={Calendar03Icon} size={20} />{featuredMatch.date} - {featuredMatch.time}</p>
        </div>
        <Button asChild className="group relative mt-8 h-16 gap-5 rounded-full bg-white pr-2.5 pl-8 text-base font-bold tracking-wide text-black uppercase shadow-[0_14px_40px_-10px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:scale-[1.04] hover:bg-white active:scale-100">
          <Link to="/acesso">
            {!reducedMotion && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.6)', '0 0 0 18px rgba(255,255,255,0)'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />}
            Comprar ingresso
            <span className="flex size-11 items-center justify-center rounded-full bg-[#ED1C24] text-white transition-transform duration-200 group-hover:rotate-45"><HugeiconsIcon icon={ArrowUpRight01Icon} className="size-5!" /></span>
          </Link>
        </Button>
      </motion.div>
    </section>
  )
}
