import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />,
        info: <HugeiconsIcon icon={InformationCircleIcon} className="size-4" />,
        warning: <HugeiconsIcon icon={Alert02Icon} className="size-4" />,
        error: <HugeiconsIcon icon={CancelCircleIcon} className="size-4" />,
        loading: <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
