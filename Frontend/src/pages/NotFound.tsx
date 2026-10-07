import { Link } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import Brand from '@/components/Brand'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-[#111111]">
      <header className="mx-auto flex w-full max-w-7xl justify-center px-6 pt-8 sm:px-12 sm:pt-10 lg:justify-start"><Brand /></header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-8 px-6 py-14 text-center sm:px-12 lg:flex-row lg:gap-16 lg:text-left">
        <img src="/Mascote404.webp" alt="" className="w-56 shrink-0 drop-shadow-[0_24px_30px_rgba(0,0,0,0.18)] sm:w-72 lg:w-[26rem]" />
        <div className="min-w-0">
          <p className="text-[clamp(6rem,24vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.06em] text-[#ED1C24]">404</p>
          <h1 className="mt-6 text-3xl leading-[0.95] font-extrabold tracking-[-0.03em] uppercase sm:text-5xl">Página não <span className="text-[#ED1C24]">encontrada</span></h1>
          <p className="mx-auto mt-5 max-w-md text-base text-neutral-700 sm:text-lg lg:mx-0">Este endereço não existe ou saiu do ar. O jogo continua em outro lugar.</p>
          <div className="mt-8 flex justify-center lg:justify-start">
            <Button asChild className="h-12 gap-4 rounded-full bg-[#ED1C24] px-7 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-[#ED1C24]/30 hover:bg-[#d0161d]">
              <Link to="/">Voltar ao início <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} /></Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
