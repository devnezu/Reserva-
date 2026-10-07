import { Component, useId, useRef, useState, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'

class QRCodeFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <p role="status" className="max-w-60 text-center text-sm text-neutral-600">Não foi possível exibir o QR Code. Use o código abaixo.</p>
    return this.props.children
  }
}

export function ReservationCode({ code }: { code: string }) {
  const headingId = useId()
  const codeRef = useRef<HTMLElement>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'manual'>('idle')

  async function copy() {
    setCopyState('copying')
    try {
      await navigator.clipboard.writeText(code)
      setCopyState('copied')
    } catch {
      const element = codeRef.current
      if (element) {
        element.focus()
        const range = document.createRange()
        range.selectNodeContents(element)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      setCopyState('manual')
    }
  }

  return (
    <section aria-labelledby={headingId} className="mt-6 flex min-w-0 flex-col items-center gap-4 rounded-2xl bg-[#faf8f7] p-5 text-center sm:p-6">
      <div>
        <h3 id={headingId} className="text-sm font-extrabold tracking-wide uppercase">Código da reserva</h3>
        <p className="mt-2 text-sm text-neutral-600">Apresente este QR Code na leitura simulada.</p>
      </div>
      <div className="flex min-h-50 max-w-full items-center justify-center rounded-2xl border border-black/10 bg-white p-3">
        <QRCodeFallback key={code}>
          <QRCodeSVG value={code} size={200} level="M" marginSize={4} bgColor="#FFFFFF" fgColor="#000000" role="img" aria-label="QR Code da reserva" title="QR Code da reserva" className="h-auto max-w-full" />
        </QRCodeFallback>
      </div>
      <div className="w-full max-w-sm">
        <p className="mb-2 text-xs text-neutral-600">Se o QR Code não puder ser lido, use este código:</p>
        <code ref={codeRef} tabIndex={0} aria-label="Código para leitura manual" className="block select-all rounded-xl border border-black/10 bg-white px-4 py-3 font-mono text-sm break-all text-neutral-800 focus-visible:outline-[#ED1C24]">{code}</code>
      </div>
      <Button type="button" disabled={copyState === 'copying'} onClick={() => { void copy() }} variant="outline" className="h-11 max-w-full rounded-full border-black/15 bg-white px-5 text-xs font-bold tracking-wide uppercase shadow-none">
        {copyState === 'copying' ? 'Copiando…' : copyState === 'copied' ? 'Código copiado!' : 'Copiar código da reserva'}
      </Button>
      <p role="status" aria-live="polite" className={copyState === 'manual' ? 'text-xs text-neutral-600' : 'sr-only'}>
        {copyState === 'copied' ? 'Código copiado para a área de transferência.' : copyState === 'manual' ? 'Não foi possível copiar automaticamente. O código foi selecionado para você copiar manualmente.' : ''}
      </p>
    </section>
  )
}
