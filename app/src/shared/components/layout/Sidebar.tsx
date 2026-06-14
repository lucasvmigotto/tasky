import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { type LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/Tooltip'

export interface SidebarNavItem {
  label: string
  href: string
  icon: LucideIcon
  children?: SidebarNavItem[]
}

export interface SidebarProps {
  items?: SidebarNavItem[]
  isCollapsed?: boolean
  collapsed?: boolean
  onToggle?: () => void
  isMobile?: boolean
  isOpen?: boolean
  logo?: ReactNode
  bottomContent?: ReactNode
  children?: ReactNode
}

function Sidebar({ items, isCollapsed, collapsed, onToggle, isMobile, isOpen, logo, bottomContent, children }: SidebarProps) {
  const actualCollapsed = collapsed ?? isCollapsed ?? false
  const actualMobile = isMobile ?? false
  const actualOpen = isOpen ?? false
  const location = useLocation()

  if (actualMobile && !actualOpen) return null

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
        actualCollapsed && !actualMobile ? 'w-[70px]' : 'w-64',
        actualMobile && 'fixed inset-y-0 left-0 z-50 w-64',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {(!actualCollapsed || actualMobile) && (
          <div className="flex items-center gap-2 overflow-hidden">
            {logo || (
              <span className="text-lg font-bold tracking-tight">TaskY</span>
            )}
          </div>
        )}
        {actualCollapsed && !actualMobile && (
          <div className="flex w-full items-center justify-center">
            <span className="text-lg font-bold">T</span>
          </div>
        )}
        {!actualMobile && onToggle && (
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {actualCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        )}
      </div>

      {children ? (
        <div className="flex-1 overflow-y-auto">{children}</div>
      ) : items ? (
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href))

              const linkContent = (
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {(!actualCollapsed || actualMobile) && <span>{item.label}</span>}
                </Link>
              )

              if (actualCollapsed && !actualMobile) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger className="w-full">{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return <li key={item.href}>{linkContent}</li>
            })}
          </ul>
        </nav>
      ) : null}

      {bottomContent && (
        <div className="border-t border-sidebar-border p-3">
          {(!actualCollapsed || actualMobile) ? bottomContent : (
            <div className="flex justify-center">{bottomContent}</div>
          )}
        </div>
      )}
    </aside>
  )

  if (actualMobile) {
    return (
      <AnimatePresence>
        {actualOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return sidebarContent
}

export { Sidebar }
