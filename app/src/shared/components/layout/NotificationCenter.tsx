import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/core/api/hooks'
import type { NotificationResponse } from '@/core/api/types'
import { ROUTES, buildRoute } from '@/core/config/routes'
import { Button } from '@/shared/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/DropdownMenu'
import { cn } from '@/shared/lib/cn'
import { formatDateTime } from '@/shared/lib/formatters'

interface NotificationCenterProps {
  fallbackCount?: number
  onNotificationClick?: () => void
}

function notificationRoute(notification: NotificationResponse): string | null {
  if (!notification.resourceId) return null
  if (notification.resourceType === 'activity') {
    return buildRoute(ROUTES.ACTIVITY_DETAIL, { activityId: notification.resourceId })
  }
  if (notification.type === 'OPEN_TIMER') return ROUTES.TIME_TRACKER
  if (notification.type === 'TIME_ENTRY_PENDING_APPROVAL') return ROUTES.TIMESHEET
  if (notification.resourceType === 'time_entry') return ROUTES.TIMESHEET
  if (notification.resourceType === 'membership') return ROUTES.SETTINGS
  return null
}

export function NotificationCenter({ fallbackCount = 0, onNotificationClick }: NotificationCenterProps) {
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const notifications = useNotifications()
  const unread = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const count = unread.data?.count ?? fallbackCount
  const visible = (notifications.data ?? []).filter((item) => !unreadOnly || !item.readAt)

  const openNotification = (notification: NotificationResponse) => {
    if (!notification.readAt) markRead.mutate(notification.id)
    onNotificationClick?.()
    const route = notificationRoute(notification)
    if (route) navigate(route)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label={`Notificações${count ? `, ${count} não lidas` : ''}`}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[80vh] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            <p className="text-xs text-muted-foreground">{count} não {count === 1 ? 'lida' : 'lidas'}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={count === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Marcar todas como lidas
          </Button>
        </div>
        <div className="flex gap-1 px-2 pb-2" aria-label="Filtrar notificações">
          <Button type="button" size="sm" variant={unreadOnly ? 'ghost' : 'secondary'} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
            Todas
          </Button>
          <Button type="button" size="sm" variant={unreadOnly ? 'secondary' : 'ghost'} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
            Não lidas
          </Button>
        </div>
        <DropdownMenuSeparator />
        {notifications.isLoading ? (
          <div className="px-3 py-5 text-sm text-muted-foreground" role="status">Carregando notificações...</div>
        ) : notifications.isError ? (
          <div className="space-y-2 px-3 py-5" role="alert">
            <p className="text-sm text-destructive">Não foi possível carregar as notificações.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => notifications.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-3 py-5 text-sm text-muted-foreground">
            {unreadOnly ? 'Nenhuma notificação não lida' : 'Sem notificações'}
          </div>
        ) : visible.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className={cn('items-start py-2.5', !notification.readAt && 'bg-muted/60')}
            onClick={() => openNotification(notification)}
          >
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', notification.readAt ? 'bg-transparent' : 'bg-primary')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              {notification.body && <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
