import Navbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import NextMatches from '@/components/home/NextMatches'
import Footer from '@/components/home/Footer'

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-black">
      <div className="relative bg-[#8c0a11]">
        <img src="/backgroundHomeVertical.png" alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover xl:hidden" />
        <Navbar className="relative z-10 xl:absolute xl:inset-x-0 xl:top-0" />
        <Hero />
        <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 -bottom-px h-10 w-full fill-[#faf8f7] sm:h-14 xl:h-20">
          <path opacity="0.45" d="M0,30 C220,70 460,0 720,24 C980,48 1210,4 1440,34 L1440,80 L0,80 Z" />
          <path d="M0,52 C240,84 480,22 720,42 C960,62 1200,18 1440,46 L1440,80 L0,80 Z" />
        </svg>
      </div>
      <main className="flex flex-1 flex-col">
        <NextMatches />
      </main>
      <Footer />
    </div>
  )
}
