import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { featuredMatch } from './matches'
import TeamName from './TeamName'

export default function Hero() {
  const reducedMotion = useReducedMotion()
  return (
    <section aria-labelledby="hero-title" className="relative flex flex-col xl:min-h-[max(480px,33.8vw)] xl:justify-center">
      <img src="/backgroundHome.png" alt="Três jogadores do São Paulo sorrindo com a camisa branca do clube" className="h-64 w-full object-cover object-right sm:h-80 lg:h-[420px] xl:absolute xl:inset-0 xl:h-full" />
      <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-[#4d0408]/80 via-[#4d0408]/25 via-40% to-transparent xl:block" />

      <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative mx-auto w-full max-w-7xl px-6 py-14 text-white sm:px-12 xl:pb-8 xl:pt-28">
        <h1 id="hero-title" className="max-w-md text-5xl leading-[0.98] font-semibold tracking-[-0.05em] uppercase sm:text-6xl xl:text-5xl 2xl:max-w-xl 2xl:text-7xl"><TeamName name={featuredMatch.home} crest={featuredMatch.homeCrest} /><br /><span className="font-light lowercase italic">x</span> <TeamName name={featuredMatch.away} crest={featuredMatch.awayCrest} /></h1>
        <p className="mt-6 flex items-center gap-2.5 text-base font-medium"><HugeiconsIcon icon={Calendar03Icon} size={18} />{featuredMatch.date} - {featuredMatch.time}</p>
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
