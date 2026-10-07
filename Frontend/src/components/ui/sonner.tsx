import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Tempo que o toast fica na tela; a barra de progresso usa o mesmo valor.
const TOAST_DURATION_MS = 6000

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      className="toaster group"
      icons={{
        success: <img src="/MascoteSucesso.webp" alt="" className="size-full scale-125 object-contain" />,
        info: <img src="/MascoteInfo.webp" alt="" className="size-full scale-125 object-contain" />,
        warning: <HugeiconsIcon icon={Alert02Icon} />,
        error: <img src="/MascoteFail.webp" alt="" className="size-full scale-125 object-contain" />,
        loading: <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        duration: TOAST_DURATION_MS,
        ...toastOptions,
        style: { "--toast-duration": `${TOAST_DURATION_MS}ms`, ...toastOptions?.style } as React.CSSProperties,
        classNames: {
          toast:
            "group/toast flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-black/10 bg-white py-3.5 pr-6 pl-3.5 font-sans text-[#111111] shadow-[0_20px_45px_-18px_rgba(0,0,0,0.45)] after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:origin-left after:bg-[#ED1C24] after:[animation:toast-timer_var(--toast-duration)_linear_forwards] group-hover:after:[animation-play-state:paused] sm:w-[var(--width)]",
          icon:
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white [&_svg]:size-5 group-data-[type=error]/toast:size-14 group-data-[type=error]/toast:bg-transparent group-data-[type=info]/toast:size-14 group-data-[type=info]/toast:bg-transparent group-data-[type=success]/toast:size-14 group-data-[type=success]/toast:bg-transparent group-data-[type=warning]/toast:bg-amber-500",
          content: "flex min-w-0 flex-col gap-0.5",
          title: "text-sm leading-tight font-extrabold tracking-[0.02em] uppercase",
          description: "text-sm leading-snug text-neutral-600",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
