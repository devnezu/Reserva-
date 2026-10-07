import { Link } from 'react-router'
import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from '@/components/brand-mark'

export default function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" aria-label="Reservaí — início" className={`inline-flex w-40 shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-48 ${light ? 'text-white' : 'text-[#1c1f23]'}`}>
      <svg aria-hidden="true" viewBox={BRAND_MARK_VIEWBOX} className="h-auto w-full" fillRule="evenodd">
        {BRAND_MARK_PATHS.map((d, index) => <path key={index} d={d} fill={!light && index === 0 ? '#ED1C24' : 'currentColor'} />)}
      </svg>
    </Link>
  )
}
