import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import heroImage from '@/assets/home-hero.png'
import { featuredMatch } from './matches'

export default function Hero() {
  const reducedMotion = useReducedMotion()
  return (
    <section aria-labelledby="hero-title" className="relative flex flex-col xl:min-h-[max(480px,33.8vw)] xl:justify-center">
      <img src={heroImage} alt="Três jogadores do São Paulo sorrindo com a camisa branca do clube" className="h-64 w-full object-cover object-right sm:h-80 lg:h-[420px] xl:absolute xl:inset-0 xl:h-full" />
      <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-[#4d0408]/80 via-[#4d0408]/25 via-40% to-transparent xl:block" />

      <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative mx-auto w-full max-w-7xl px-6 py-14 text-white sm:px-12 xl:pb-8 xl:pt-28">
        <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em]"><span className="h-1.5 w-1.5 rounded-full bg-white" />{featuredMatch.competition}</p>
        <h1 id="hero-title" className="max-w-md text-5xl leading-[0.98] font-semibold tracking-[-0.05em] uppercase sm:text-6xl xl:text-5xl 2xl:max-w-xl 2xl:text-7xl">{featuredMatch.home}<br /><span className="font-light lowercase italic">x</span> {featuredMatch.away}</h1>
        <p className="mt-6 flex items-center gap-2.5 text-base font-medium"><HugeiconsIcon icon={Calendar03Icon} size={18} />{featuredMatch.date} - {featuredMatch.time}</p>
        <Button asChild className="mt-7 h-14 gap-8 rounded-full bg-white px-8 text-sm font-semibold text-black hover:bg-white/90">
          <Link to="/acesso">Comprar ingresso <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} /></Link>
        </Button>
      </motion.div>
    </section>
  )
}
