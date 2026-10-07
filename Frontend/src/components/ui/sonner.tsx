import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CheckmarkCircle02Icon} />,
        info: <img src="/Mascote.png" alt="" className="size-full scale-125 object-contain" />,
        warning: <HugeiconsIcon icon={Alert02Icon} />,
        error: <HugeiconsIcon icon={CancelCircleIcon} />,
        loading: <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        ...toastOptions,
        classNames: {
          toast:
            "group/toast flex w-full items-center gap-4 rounded-3xl border border-black/10 bg-white py-3.5 pr-6 pl-3.5 font-sans text-[#111111] shadow-[0_20px_45px_-18px_rgba(0,0,0,0.45)] sm:w-[var(--width)]",
          icon:
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white [&_svg]:size-5 group-data-[type=info]/toast:size-14 group-data-[type=info]/toast:bg-transparent group-data-[type=error]/toast:bg-[#ED1C24] group-data-[type=success]/toast:bg-emerald-600 group-data-[type=warning]/toast:bg-amber-500",
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
