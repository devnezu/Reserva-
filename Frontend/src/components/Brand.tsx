import { Link } from 'react-router'

export default function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" aria-label="Reservai — início" className="relative block aspect-[5/1] w-40 shrink-0 overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-48">
      <img
        src="/Logo Reservai com símbolo de ingresso.png"
        alt="Reservai"
        width={2172}
        height={724}
        className={`absolute top-1/2 left-1/2 h-auto w-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 ${light ? 'brightness-0 invert' : ''}`}
      />
    </Link>
  )
}
