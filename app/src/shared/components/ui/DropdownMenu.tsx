import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

interface DropdownMenuContextValue {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  triggerRef: RefObject<HTMLDivElement | null>
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) {
    throw new Error('DropdownMenu components must be used within <DropdownMenu>')
  }
  return ctx
}

interface DropdownMenuProps {
  children: ReactNode
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}
DropdownMenu.displayName = 'DropdownMenu'

interface DropdownMenuTriggerProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

function DropdownMenuTrigger({ children, className, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()

  return (
    <div
      ref={triggerRef}
      className={cn('inline-block cursor-pointer', className)}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
    </div>
  )
}
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
}

function DropdownMenuContent({ children, className, align = 'center', ...props }: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 128 })

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, 128)
      const left =
        align === 'start'
          ? rect.left
          : align === 'end'
            ? rect.right - menuWidth
            : rect.left + rect.width / 2 - menuWidth / 2

      setPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8)),
        minWidth: menuWidth,
      })
    }

    updatePosition()

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, open, setOpen, triggerRef])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className={cn(
            'fixed z-[1000] min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl shadow-black/20',
            className,
          )}
          style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.1 }}
          {...(props as Record<string, unknown>)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
DropdownMenuContent.displayName = 'DropdownMenuContent'

interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

function DropdownMenuItem({ className, inset, ...props }: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext()

  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className,
      )}
      onClick={(e) => {
        props.onClick?.(e)
        setOpen(false)
      }}
      {...props}
    />
  )
}
DropdownMenuItem.displayName = 'DropdownMenuItem'

function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator }
