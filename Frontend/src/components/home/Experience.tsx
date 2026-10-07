import { motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Ticket01Icon } from '@hugeicons/core-free-icons'

export default function Experience() {
  const reducedMotion = useReducedMotion()
  return (
    <section aria-labelledby="experience-title" className="mx-auto grid w-full max-w-7xl items-center gap-16 px-6 py-20 sm:px-12 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:py-28">
      <div>
        <h2 id="experience-title" className="max-w-xl text-4xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-5xl">Sua próxima boa história começa aqui.</h2>
        <p className="mt-7 max-w-sm text-base leading-relaxed text-neutral-500">Shows, encontros e momentos que ficam. Reserve seu ingresso e dê o primeiro passo para viver algo novo.</p>
      </div>

      <motion.div aria-hidden="true" initial={reducedMotion ? false : { opacity: 0, rotate: 0, y: 30 }} whileInView={{ opacity: 1, rotate: -7, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, delay: 0.15 }} className="relative mx-auto w-full max-w-[360px]">
        <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-[12deg] rounded-3xl border border-neutral-300 bg-[#ece7e4]" />
        <div className="relative overflow-hidden rounded-3xl bg-black p-8 text-white shadow-2xl shadow-black/15">
          <div className="flex items-center justify-between text-[9px] font-medium tracking-[0.18em]"><span>RESERVAI / ADMIT ONE</span><HugeiconsIcon icon={Ticket01Icon} size={25} /></div>
          <p className="mt-16 text-[11px] tracking-[0.24em] text-white/50">SEU LUGAR É AQUI.</p>
          <p className="mt-3 text-5xl leading-none font-medium tracking-[-0.05em]">Viva o<br />inesquecível.</p>
          <div className="relative -mx-8 mt-12 border-t border-dashed border-white/30"><span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#faf8f7]" /><span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#faf8f7]" /></div>
          <div className="mt-7 flex items-end justify-between"><div><p className="text-[9px] tracking-[0.18em] text-white/50">DESTINO</p><p className="mt-1 text-sm">Novas memórias</p></div><span className="text-4xl font-light">01</span></div>
          <div className="mt-7 h-9 bg-[repeating-linear-gradient(90deg,white_0px,white_2px,transparent_2px,transparent_5px,white_5px,white_6px,transparent_6px,transparent_9px)] opacity-80" />
        </div>
      </motion.div>
    </section>
  )
}
