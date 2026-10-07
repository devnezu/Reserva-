export default function TeamName({ name, crest }: { name: string; crest?: string }) {
  return (
    <span className="inline-flex items-center gap-[0.2em]">
      {crest && <img src={crest} alt="" aria-hidden="true" draggable={false} className="h-[0.85em] w-[0.85em] shrink-0 object-contain" />}
      <span>{name}</span>
    </span>
  )
}
