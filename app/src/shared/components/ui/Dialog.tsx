import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type Dispatch,
  type HTMLAttributes,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface DialogContextValue {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error('Dialog components must be used within <Dialog>')
  }
  return ctx
}

interface DialogProps {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(open) : value
      onOpenChange?.(next)
      if (controlledOpen === undefined) {
        setInternalOpen(next)
      }
    },
    [open, controlledOpen, onOpenChange],
  )

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}
Dialog.displayName = 'Dialog'

interface DialogTriggerProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function DialogTrigger({ children, className, ...props }: DialogTriggerProps) {
  const { setOpen } = useDialogContext()

  return (
    <div
      className={cn('inline-block cursor-pointer', className)}
      onClick={() => setOpen(true)}
      {...props}
    >
      {children}
    </div>
  )
}
DialogTrigger.displayName = 'DialogTrigger'

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

function DialogContent({ children, className, ...props }: DialogContentProps) {
  const { open, setOpen } = useDialogContext()

  useEffect(() => {
    if (!open) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, setOpen])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className={cn(
              'relative z-50 w-full max-w-lg gap-4 border border-border bg-background p-6 shadow-lg sm:rounded-lg',
              className,
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            {...(props as Record<string, unknown>)}
          >
            {children}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
DialogContent.displayName = 'DialogContent'

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}
DialogHeader.displayName = 'DialogHeader'

function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}
DialogTitle.displayName = 'DialogTitle'

function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
DialogDescription.displayName = 'DialogDescription'

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
  )
}
DialogFooter.displayName = 'DialogFooter'

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
