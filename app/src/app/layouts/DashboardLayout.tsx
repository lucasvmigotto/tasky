import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { toast } from 'sonner'
import { hasMinRole } from '@/core/auth/permissions'
import { ROUTES } from '@/core/config/routes'
import { Topbar } from '@/shared/components/layout/Topbar'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Shield,
  Users,
  Building2,
  Folders,
  Clock,
  ChevronDown,
  Settings2,
  ClipboardList,
  Kanban,
} from 'lucide-react'
import type { Role } from '@/core/auth/permissions'
import type { SidebarNavItem } from '@/shared/components/layout/Sidebar'
import type { TopbarUser } from '@/shared/components/layout/Topbar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { cn } from '@/shared/lib/cn'
import { ErrorBoundary } from '@/core/errors/ErrorBoundary'

interface NavEntry extends SidebarNavItem {
  key: string
}

const ALL_NAV_ITEMS: NavEntry[] = [
  { key: 'my-work', label: 'Meu Trabalho', href: ROUTES.MY_WORK, icon: LayoutDashboard },
  { key: 'requests', label: 'Demandas', href: ROUTES.REQUESTS, icon: ClipboardList },
  { key: 'projects', label: 'Projetos', href: ROUTES.PROJECTS, icon: Folders },
  { key: 'activities', label: 'Atividades', href: ROUTES.ACTIVITIES, icon: Kanban },
  { key: 'timesheet', label: 'Minha Semana', href: ROUTES.TIMESHEET, icon: CalendarDays },
  { key: 'my-report', label: 'Meu Relatório', href: ROUTES.REPORTS, icon: BarChart3 },
  { key: 'sector-report', label: 'Relatório do Setor', href: ROUTES.REPORTS, icon: BarChart3 },
]

const ADMIN_CHILDREN: NavEntry[] = [
  { key: 'admin-overview', label: 'Visão Geral', href: ROUTES.ADMIN.DASHBOARD, icon: LayoutDashboard },
  { key: 'admin-members', label: 'Membros', href: ROUTES.ADMIN.MEMBERS, icon: Users },
  { key: 'admin-departments', label: 'Departamentos', href: ROUTES.ADMIN.DEPARTMENTS, icon: Building2 },
  { key: 'admin-projects', label: 'Projetos', href: ROUTES.ADMIN.PROJECTS, icon: Folders },
  { key: 'admin-settings', label: 'Configurações', href: ROUTES.ADMIN.SETTINGS, icon: Settings2 },
]

function filterByRole(items: NavEntry[], role: Role): NavEntry[] {
  return items.filter((item) => {
    if (item.key === 'my-report') return !hasMinRole(role, 'manager')
    if (item.key === 'sector-report') return hasMinRole(role, 'manager')
    return true
  })
}

function filterAdminChildren(children: NavEntry[], role: Role): NavEntry[] {
  return children.filter((item) => {
    const roles: Record<string, Role> = {
      'admin-members': 'manager',
      'admin-departments': 'admin',
      'admin-projects': 'manager',
      'admin-settings': 'super_admin',
    }
    const minRole = roles[item.key]
    if (!minRole) return true
    return hasMinRole(role, minRole)
  })
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

  async function handleOrgChange(orgId: string) {
    try {
      const org = organizations.find((item) => item.id === orgId)
      if (!org) return
      await useAuthStore.getState().setActiveOrg(org)
      toast.success(`Organização alterada para ${org.name}`)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao trocar de organização')
    }
  }

  async function handleLogout() {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const role = activeOrg?.role ?? 'employee'
  const isManagerOrAdmin = hasMinRole(role, 'manager')

  const mainNav = useMemo(() => filterByRole(ALL_NAV_ITEMS, role), [role])
  const adminNav = useMemo(() => filterAdminChildren(ADMIN_CHILDREN, role), [role])
  const isAdminActive = ADMIN_CHILDREN.some((c) => location.pathname.startsWith(c.href))

  const isActive = (href: string) =>
    location.pathname === href || (href !== '/' && location.pathname.startsWith(href))

  const topbarUser: TopbarUser | undefined = user
    ? {
        name: user.displayName ?? '',
        email: user.email,
        avatarUrl: user.avatarUrl ?? undefined,
        initials: getInitials(user.displayName ?? ''),
      }
    : undefined

  const logo = (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
        <Clock className="size-4 text-primary-foreground" />
      </div>
      <span className="text-lg font-bold tracking-tight">
        <span className="text-primary">Task</span>
        <span className="text-foreground">Y</span>
      </span>
    </div>
  )

  const navPill = cn(
    'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        {logo}

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Navegação principal">
          {mainNav.map((item) => {
            const active = isActive(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  navPill,
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </a>
            )
          })}

          {isManagerOrAdmin && adminNav.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  navPill,
                  isAdminActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Shield className="size-4 shrink-0" />
                <span className="whitespace-nowrap">Administrador</span>
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <div className="flex flex-col gap-0.5">
                  {adminNav.map((child) => {
                    const active = location.pathname === child.href
                    return (
                      <a
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-accent text-accent-foreground'
                            : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <child.icon className="size-4 shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </a>
                    )
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {organizations.length > 1 && (
          <select
            value={activeOrg?.id ?? ''}
            onChange={(e) => handleOrgChange(e.target.value)}
            className="h-9 shrink-0 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            aria-label="Organização ativa"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      </header>

      <ErrorBoundary
        fallback={
          <div className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-background px-4 text-xs text-muted-foreground">
            TaskY
          </div>
        }
      >
        <Topbar
          user={topbarUser}
          onLogout={handleLogout}
          onSettings={() => navigate(ROUTES.SETTINGS)}
          onProfile={() => navigate(ROUTES.SETTINGS)}
        />
      </ErrorBoundary>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
