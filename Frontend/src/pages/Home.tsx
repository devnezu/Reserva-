import Navbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import NextMatches from '@/components/home/NextMatches'
import Footer from '@/components/home/Footer'

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip bg-[#faf8f7] text-black">
      <div className="relative bg-[#8c0a11]">
        <Navbar className="xl:absolute xl:inset-x-0 xl:top-0 xl:z-10" />
        <Hero />
      </div>
      <main className="flex flex-1 flex-col">
        <NextMatches />
      </main>
      <Footer />
    </div>
  )
}
