import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Search, Bell, ChevronDown, Settings, LogOut, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/components/ui/Button'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'

export interface TopbarUser {
  name: string
  email: string
  avatarUrl?: string
  initials: string
}

export interface TopbarProps {
  onMenuClick?: () => void
  isMobile?: boolean
  user?: TopbarUser
  onLogout?: () => void
  onSettings?: () => void
  onProfile?: () => void
  breadcrumbs?: { label: string; href?: string }[]
  title?: string
  notificationCount?: number
  onNotificationClick?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

function Topbar({
  onMenuClick,
  isMobile,
  user,
  onLogout,
  onSettings,
  onProfile,
  breadcrumbs,
  title,
  notificationCount = 0,
  onNotificationClick,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Pesquisar...',
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      {isMobile && onMenuClick && (
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
          <Menu className="size-5" />
        </Button>
      )}

      {title && !breadcrumbs && (
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      )}

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="hidden items-center gap-1.5 text-sm md:flex">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-muted-foreground">/</span>}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex flex-1 items-center justify-end gap-3">
        {onSearchChange && (
          <div className="relative hidden max-w-xs flex-1 md:block">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {onNotificationClick && (
          <Button variant="ghost" size="icon" className="relative shrink-0" onClick={onNotificationClick} aria-label="Notificações">
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Button>
        )}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col text-left md:flex">
                <span className="text-sm font-medium leading-none">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
              <ChevronDown className="hidden size-3 text-muted-foreground md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              {onProfile && (
                <DropdownMenuItem onClick={onProfile}>
                  <User className="size-4" />
                  Perfil
                </DropdownMenuItem>
              )}
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="size-4" />
                  Configurações
                </DropdownMenuItem>
              )}
              {(onProfile || onSettings) && onLogout && <DropdownMenuSeparator />}
              {onLogout && (
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
Topbar.displayName = 'Topbar'

export { Topbar }
