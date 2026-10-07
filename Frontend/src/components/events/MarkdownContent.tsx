import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export function MarkdownContent({ content }: { content: string }) {
  return <div className="min-w-0 space-y-4 text-base leading-relaxed break-words text-neutral-700 sm:text-lg [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-[#111111] [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-[#111111] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#111111] [&_h4]:font-bold [&_h5]:font-bold [&_h6]:font-bold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_li>p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#ED1C24] [&_blockquote]:bg-[#ED1C24]/5 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-neutral-900 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm [&_pre_code]:bg-transparent [&_hr]:border-black/15 [&_th]:border [&_th]:border-black/15 [&_th]:bg-black/5 [&_th]:px-4 [&_th]:py-2 [&_td]:border [&_td]:border-black/15 [&_td]:px-4 [&_td]:py-2">
    <Markdown skipHtml remarkPlugins={[remarkGfm, remarkBreaks]} components={{
      a: ({ href, children }) => href ? <a href={href} className="font-semibold text-[#ED1C24] underline underline-offset-4 hover:text-[#d0161d]" target={/^https?:\/\//i.test(href) ? '_blank' : undefined} rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
      img: ({ src, alt, title }) => src ? <img src={src} alt={alt ?? ''} title={title} loading="lazy" className="my-4 max-h-[32rem] max-w-full rounded-xl object-contain" /> : null,
      table: ({ children }) => <div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
    }}>{content}</Markdown>
  </div>
}
