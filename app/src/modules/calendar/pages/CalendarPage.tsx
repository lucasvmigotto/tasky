import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Circle,
  Clock,
  Target,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { cn } from '@/shared/lib/cn'
import { getMonthName } from '@/shared/lib/dates'
import { demoCalendarEvents, type DemoCalendarEvent } from '@/modules/calendar/data/calendar.mock'

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function getDaysInMonth(date: Date): number {
  return endOfMonth(date).getDate()
}

function getFirstDayOfMonth(date: Date): number {
  const d = startOfMonth(date)
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

const TYPE_ICONS: Record<DemoCalendarEvent['type'], typeof Circle> = {
  activity: Clock,
  meeting: Users,
  deadline: Target,
}

const TYPE_COLORS: Record<DemoCalendarEvent['type'], string> = {
  activity: 'border-l-blue-500 bg-blue-500/10 text-blue-400',
  meeting: 'border-l-emerald-500 bg-emerald-500/10 text-emerald-400',
  deadline: 'border-l-amber-500 bg-amber-500/10 text-amber-400',
}

const TYPE_BADGE: Record<DemoCalendarEvent['type'], 'info' | 'success' | 'warning'> = {
  activity: 'info',
  meeting: 'success',
  deadline: 'warning',
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

function getEventsForDay(events: DemoCalendarEvent[], day: Date): DemoCalendarEvent[] {
  return events.filter((e) => {
    const start = new Date(e.startDatetime)
    return isSameDay(start, day)
  })
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [typeFilter, setTypeFilter] = useState<DemoCalendarEvent['type'] | 'all'>('all')

  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return demoCalendarEvents
    return demoCalendarEvents.filter((e) => e.type === typeFilter)
  }, [typeFilter])

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
    return Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - firstDay + 1
      if (dayNum < 1 || dayNum > daysInMonth) return null
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum)
    })
  }, [currentDate])

  const goPreviousMonth = () => setCurrentDate((prev) => addMonths(prev, -1))
  const goNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1))
  const goToday = () => setCurrentDate(new Date())

  const monthLabel = getMonthName(currentDate)

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader title="Calendário" description="Visualize eventos, prazos e atividades">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            <CalendarIcon className="mr-1 size-4" />
            Hoje
          </Button>
          <div className="flex items-center rounded-lg border border-border bg-card">
            <Button variant="ghost" size="icon" className="size-8 rounded-none rounded-l-lg" onClick={goPreviousMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[180px] text-center text-sm font-medium capitalize text-foreground">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="size-8 rounded-none rounded-r-lg" onClick={goNextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </PageHeader>

      <Tabs defaultValue="all" value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="activity">Atividades</TabsTrigger>
          <TabsTrigger value="meeting">Reuniões</TabsTrigger>
          <TabsTrigger value="deadline">Prazos</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {name}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="min-h-[100px] rounded-md bg-muted/20" />
              }

              const dayEvents = getEventsForDay(filteredEvents, day)
              const today = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'group relative min-h-[100px] rounded-md border border-border/30 p-1.5 transition-colors hover:bg-muted/30',
                    today && 'border-emerald-500/40 bg-emerald-500/5',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                        today
                          ? 'bg-emerald-500 text-white'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const Icon = TYPE_ICONS[event.type]
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium',
                            TYPE_COLORS[event.type],
                          )}
                          title={event.title}
                        >
                          <Icon className="size-2.5 shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-medium text-foreground">Eventos do Mês</h3>
          <div className="divide-y divide-border/50">
            {filteredEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum evento encontrado para este filtro.
              </p>
            ) : (
              filteredEvents.map((event) => {
                const Icon = TYPE_ICONS[event.type]
                const start = new Date(event.startDatetime)
                const end = new Date(event.endDatetime)
                const isAllDay = start.getTime() === end.getTime()

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-lg font-bold tabular-nums text-foreground">
                        {String(start.getDate()).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">
                        {start.toLocaleDateString('pt-BR', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center gap-3">
                      <Icon className={cn('size-4', TYPE_COLORS[event.type].split(' ')[2])} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAllDay && (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <Badge variant={TYPE_BADGE[event.type]} className="text-[10px] px-1.5 py-0">
                        {event.type === 'activity' ? 'Atividade' : event.type === 'meeting' ? 'Reunião' : 'Prazo'}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
