import { HugeiconsIcon } from '@hugeicons/react'
import { WavingHand01Icon } from '@hugeicons/core-free-icons'

export default function HelloWorld() {
  return (
    <main className="flex min-h-screen items-center justify-center gap-3 bg-slate-950 text-white">
      <HugeiconsIcon icon={WavingHand01Icon} size={32} aria-hidden="true" />
      <h1 className="text-4xl font-semibold">Hello World</h1>
    </main>
  )
}
