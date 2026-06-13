import {
  createContext,
  useContext,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

interface TooltipContextValue {
  open: boolean
  setOpen: (value: boolean) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const ctx = useContext(TooltipContext)
  if (!ctx) {
    throw new Error('Tooltip components must be used within <Tooltip>')
  }
  return ctx
}

function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  )
}
Tooltip.displayName = 'Tooltip'

function TooltipTrigger({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = useTooltipContext()

  return (
    <div
      className={cn('inline-block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </div>
  )
}
TooltipTrigger.displayName = 'TooltipTrigger'

interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

function TooltipContent({ children, className, side = 'top', ...props }: TooltipContentProps) {
  const { open } = useTooltipContext()

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="relative">
          <motion.div
            className={cn(
              'absolute z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
              sideClasses[side],
              className,
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            {...(props as Record<string, unknown>)}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipTrigger, TooltipContent }
