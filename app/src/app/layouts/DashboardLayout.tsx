import { useState, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { hasMinRole } from '@/core/auth/permissions'
import { ROUTES } from '@/core/config/routes'
import { useLocalStorage } from '@/shared/hooks/async'
import { Sidebar } from '@/shared/components/layout/Sidebar'
import { Topbar } from '@/shared/components/layout/Topbar'
import {
  LayoutDashboard,
  CalendarDays,
  FolderKanban,
  Calendar,
  BarChart3,
  Shield,
  Users,
  Building2,
  Users2,
  Folders,
  Tags,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Clock,
} from 'lucide-react'
import type { Role } from '@/core/auth/permissions'
import type { SidebarNavItem } from '@/shared/components/layout/Sidebar'
import type { TopbarUser } from '@/shared/components/layout/Topbar'
import { cn } from '@/shared/lib/cn'

interface NavEntry extends SidebarNavItem {
  key: string
}

const ALL_NAV_ITEMS: NavEntry[] = [
  { key: 'dashboard', label: 'Painel', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { key: 'timesheet', label: 'Planilha de Horas', href: ROUTES.TIMESHEET, icon: CalendarDays },
  { key: 'projects', label: 'Projetos', href: ROUTES.PROJECTS, icon: FolderKanban },
  { key: 'calendar', label: 'Calendário', href: ROUTES.CALENDAR, icon: Calendar },
  { key: 'reports', label: 'Relatórios', href: ROUTES.REPORTS, icon: BarChart3 },
  { key: 'settings', label: 'Configurações', href: ROUTES.SETTINGS, icon: Settings },
]

const ADMIN_CHILDREN: NavEntry[] = [
  { key: 'admin-overview', label: 'Visão Geral', href: ROUTES.ADMIN.DASHBOARD, icon: LayoutDashboard },
  { key: 'admin-members', label: 'Membros', href: ROUTES.ADMIN.MEMBERS, icon: Users },
  { key: 'admin-departments', label: 'Departamentos', href: ROUTES.ADMIN.DEPARTMENTS, icon: Building2 },
  { key: 'admin-teams', label: 'Equipes', href: ROUTES.ADMIN.TEAMS, icon: Users2 },
  { key: 'admin-projects', label: 'Projetos', href: ROUTES.ADMIN.PROJECTS, icon: Folders },
  { key: 'admin-labels', label: 'Etiquetas', href: ROUTES.ADMIN.LABELS, icon: Tags },
]

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Painel',
  [ROUTES.TIMESHEET]: 'Planilha de Horas',
  [ROUTES.PROJECTS]: 'Projetos',
  [ROUTES.CALENDAR]: 'Calendário',
  [ROUTES.REPORTS]: 'Relatórios',
  [ROUTES.ADMIN.DASHBOARD]: 'Visão Geral',
  [ROUTES.ADMIN.MEMBERS]: 'Membros',
  [ROUTES.ADMIN.DEPARTMENTS]: 'Departamentos',
  [ROUTES.ADMIN.TEAMS]: 'Equipes',
  [ROUTES.ADMIN.PROJECTS]: 'Projetos',
  [ROUTES.ADMIN.LABELS]: 'Etiquetas',
  [ROUTES.SETTINGS]: 'Configurações',
}

function getPageTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact
  if (pathname.startsWith('/projects/')) return 'Detalhes do Projeto'
  if (pathname.startsWith('/activities/')) return 'Detalhes da Atividade'
  return 'TaskY'
}

function filterByRole(items: NavEntry[], role: Role): NavEntry[] {
  return items.filter((item) => {
    if (item.key === 'settings') return hasMinRole(role, 'leader')
    return true
  })
}

function filterAdminChildren(children: NavEntry[], role: Role): NavEntry[] {
  return children.filter((item) => {
    const roles: Record<string, Role> = {
      'admin-members': 'admin',
      'admin-departments': 'admin',
      'admin-teams': 'manager',
      'admin-projects': 'manager',
      'admin-labels': 'manager',
    }
    const minRole = roles[item.key]
    if (!minRole) return true
    return hasMinRole(role, minRole)
  })
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-600',
    'from-indigo-500 to-blue-600',
    'from-teal-500 to-emerald-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const organizations = useAuthStore((s) => s.organizations)
  const logout = useAuthStore((s) => s.logout)
  const setActiveOrg = useAuthStore((s) => s.setActiveOrg)

  const [collapsed, setCollapsed] = useLocalStorage('tasky_sidebar_collapsed', false)
  const [mobileOpen, setMobileOpen] = useLocalStorage('tasky_sidebar_mobile_open', false)

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 1023px)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (!e.matches) setMobileOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setMobileOpen])

  const role = activeOrg?.role ?? 'employee'

  const navItems = useMemo(() => {
    const items = filterByRole(ALL_NAV_ITEMS, role)
    if (hasMinRole(role, 'manager')) {
      const adminChildren = filterAdminChildren(ADMIN_CHILDREN, role)
      items.splice(items.length - 1, 0, {
        key: 'admin',
        label: 'Administrador',
        href: ROUTES.ADMIN.DASHBOARD,
        icon: Shield,
        children: adminChildren,
      })
    }
    return items
  }, [role])

  const isAdminChild = ADMIN_CHILDREN.some((c) => location.pathname.startsWith(c.href))

  function handleLogout() {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const topbarUser: TopbarUser | undefined = user
    ? {
        name: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl ?? undefined,
        initials: getInitials(user.displayName),
      }
    : undefined

  const logo = (
    <div className={cn('flex items-center', collapsed && !isMobile ? 'justify-center' : 'justify-between')}>
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Clock className="size-4 text-primary-foreground" />
        </div>
        {(!collapsed || isMobile) && (
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">Task</span>
            <span className="text-sidebar-foreground">Y</span>
          </span>
        )}
      </div>
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      )}
    </div>
  )

  const children = (
    <nav className="flex flex-1 flex-col gap-0 px-2 py-3">
      {(!collapsed || isMobile) && (
        <div className="mb-2 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
            Menu
          </span>
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))

          const hasChildren = item.children && item.children.length > 0
          const isAdminExpanded = 'children' in item && (isActive || isAdminChild)

          return (
            <div key={item.href}>
              <button
                onClick={() => {
                  navigate(item.href)
                  if (isMobile) setMobileOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive && !hasChildren
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  collapsed && !isMobile && 'justify-center px-2',
                )}
              >
                <item.icon className={cn('size-5 shrink-0', isActive && !hasChildren ? 'text-primary' : '')} />
                {(!collapsed || isMobile) && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {hasChildren && (
                      <ChevronRight
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform',
                          isAdminExpanded && 'rotate-90',
                        )}
                      />
                    )}
                  </>
                )}
              </button>

              {hasChildren && isAdminExpanded && (!collapsed || isMobile) && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border/50 pl-3">
                  {item.children!.map((child) => {
                    const childActive = location.pathname === child.href
                    return (
                      <button
                        key={child.href}
                        onClick={() => {
                          navigate(child.href)
                          if (isMobile) setMobileOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all',
                          childActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground',
                        )}
                      >
                        <child.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {organizations.length > 1 && !collapsed && (
        <div className="mt-auto border-t border-sidebar-border/40 pt-3">
          <div className="flex items-center justify-between">
            <select
              value={activeOrg?.id ?? ''}
              onChange={(e) => {
                const org = organizations.find((o) => o.id === e.target.value)
                if (org) setActiveOrg(org)
              }}
              className="w-full rounded-md border border-sidebar-border/30 bg-sidebar px-2 py-1.5 text-xs text-sidebar-foreground/60 outline-none focus:border-primary"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-sidebar-border/40 pt-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-3.5" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </nav>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        isOpen={mobileOpen}
        logo={logo}
      >
        {children}
      </Sidebar>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          isMobile={isMobile}
          onMenuClick={() => setMobileOpen(true)}
          user={topbarUser}
          onLogout={handleLogout}
          onSettings={() => navigate(ROUTES.SETTINGS)}
          onProfile={() => navigate(ROUTES.SETTINGS)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
