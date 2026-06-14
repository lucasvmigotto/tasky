import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, Clock, ListChecks, Play, Plus, Square, Timer, Trash2 } from 'lucide-react'
import type { TimeEntry } from '@/core/types/models'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select, type SelectOption } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Badge } from '@/shared/components/ui/Badge'
import { Separator } from '@/shared/components/ui/Separator'
import { Progress } from '@/shared/components/ui/Progress'
import { StatCard } from '@/shared/components/charts/StatCard'
import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/formatters'
import { demoProjects } from '@/modules/projects/data/projects.mock'
import { demoActivities } from '@/modules/activities/data/activities.mock'
import { demoTimeEntries } from '@/modules/time-tracker/data/entries.mock'
import { useTimer } from '@/modules/time-tracker/hooks/useTimer'

const DAILY_GOAL_SECONDS = 28800

const projectOptions: SelectOption[] = demoProjects
  .filter((p) => p.isActive)
  .map((p) => ({ value: p.id, label: p.name }))

function toDateInputValue(date = new Date()) {
  return date.toISOString().split('T')[0]
}

function getProjectName(projectId: string) {
  return demoProjects.find((p) => p.id === projectId)?.name ?? 'Projeto'
}

function getActivityOptions(projectId: string): SelectOption[] {
  return demoActivities
    .filter((activity) => activity.projectId === projectId)
    .map((activity) => ({ value: activity.id, label: activity.title }))
}

function secondsFromHours(hours: string, minutes: string) {
  const h = Number(hours.replace(',', '.')) || 0
  const m = Number(minutes.replace(',', '.')) || 0
  return Math.max(0, Math.round((h * 60 + m) * 60))
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`
}

function isSameDate(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10)
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export default function TimeTrackerPage() {
  const timer = useTimer()
  const [entries, setEntries] = useState<TimeEntry[]>(demoTimeEntries)
  const [projectId, setProjectId] = useState(projectOptions[0]?.value ?? '')
  const [activityId, setActivityId] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toDateInputValue())
  const [hours, setHours] = useState('1')
  const [minutes, setMinutes] = useState('0')
  const [description, setDescription] = useState('')

  const activityOptions = useMemo(() => getActivityOptions(projectId), [projectId])
  const selectedActivity = demoActivities.find((activity) => activity.id === activityId)
  const effectiveTitle = title.trim() || selectedActivity?.title || 'Apontamento manual'
  const projectName = getProjectName(projectId)

  const today = toDateInputValue()
  const todayEntries = useMemo(
    () => entries.filter((entry) => isSameDate(entry.date, today)),
    [entries, today],
  )

  const weekEntries = useMemo(() => {
    const start = startOfWeek(new Date())
    const end = endOfWeek(new Date())
    return entries.filter((entry) => {
      const d = new Date(entry.date)
      return d >= start && d <= end
    })
  }, [entries])

  const totalToday = todayEntries.reduce((sum, entry) => sum + entry.duration, 0)
  const totalWeek = weekEntries.reduce((sum, entry) => sum + entry.duration, 0)
  const progressToday = Math.min((totalToday / DAILY_GOAL_SECONDS) * 100, 100)

  const projectTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of weekEntries) {
      map.set(entry.projectName, (map.get(entry.projectName) ?? 0) + entry.duration)
    }
    return Array.from(map.entries())
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [weekEntries])

  function addManualEntry() {
    const duration = secondsFromHours(hours, minutes)
    if (!projectId || duration <= 0) return

    const startTime = `${date}T09:00:00.000Z`
    const end = new Date(startTime)
    end.setSeconds(end.getSeconds() + duration)

    setEntries((prev) => [
      {
        id: `manual-${Date.now()}`,
        projectId,
        projectName,
        title: effectiveTitle,
        description,
        startTime,
        endTime: end.toISOString(),
        duration,
        date,
        labelIds: selectedActivity?.labelIds ?? [],
      },
      ...prev,
    ])

    setTitle('')
    setDescription('')
    setHours('1')
    setMinutes('0')
  }

  function startTimer() {
    if (!projectId) return
    timer.start({
      projectId,
      projectName,
      title: effectiveTitle,
      description,
      date: today,
      labelIds: selectedActivity?.labelIds ?? [],
    })
  }

  function stopTimer() {
    const stopped = timer.stop()
    if (!stopped || !stopped.projectId) return
    const stoppedProjectId = stopped.projectId
    setEntries((prev) => [
      {
        id: `timer-${Date.now()}`,
        projectId: stoppedProjectId,
        projectName: stopped.projectName ?? getProjectName(stoppedProjectId),
        title: stopped.title ?? 'Tempo registrado',
        description: stopped.description ?? '',
        startTime: stopped.startTime ?? new Date().toISOString(),
        endTime: stopped.endTime ?? new Date().toISOString(),
        duration: stopped.duration ?? 0,
        date: today,
        labelIds: stopped.labelIds ?? [],
      },
      ...prev,
    ])
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Registro de Tempo"
        description="Use esta tela para apontar horas por projeto. Esses registros alimentam Projetos, Planilha de Horas e Relatórios."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard value={totalToday / 3600} label="Hoje" icon={Clock} formatValue={(v) => `${v.toFixed(1)}h`} />
        <StatCard value={totalWeek / 3600} label="Semana" icon={CalendarDays} formatValue={(v) => `${v.toFixed(1)}h`} />
        <StatCard value={weekEntries.length} label="Registros" icon={ListChecks} formatValue={(v) => String(Math.round(v))} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
          <CardHeader>
            <CardTitle>Apontar horas</CardTitle>
            <CardDescription>Informe o projeto, atividade e horas trabalhadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Projeto"
                options={projectOptions}
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value)
                  setActivityId('')
                }}
              />
              <Select
                label="Atividade"
                options={activityOptions}
                placeholder="Selecione uma atividade"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
              />
            </div>

            <Input
              label="Descrição do trabalho"
              placeholder="Ex: Implementação da tela de projetos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input label="Horas" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
              <Input label="Minutos" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>

            <Textarea
              label="Observações"
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Timer rápido</p>
                <p className="text-xs text-muted-foreground">
                  {timer.isRunning ? `${timer.currentEntry?.projectName ?? projectName} • ${timer.formattedTime}` : 'Inicie o cronômetro quando for trabalhar em tempo real.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={timer.isRunning ? stopTimer : startTimer}>
                  {timer.isRunning ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                  {timer.isRunning ? 'Parar e salvar' : 'Iniciar timer'}
                </Button>
                <Button onClick={addManualEntry}>
                  <Plus className="size-4" />
                  Salvar apontamento
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta do dia</CardTitle>
            <CardDescription>{formatHours(totalToday)} de 8.0h registradas hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressToday} className="h-2" />
            <div className="space-y-2">
              {projectTotals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma hora registrada nesta semana.</p>
              ) : (
                projectTotals.map((project) => (
                  <div key={project.name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate text-foreground">{project.name}</span>
                    <span className="font-semibold tabular-nums text-primary">{formatHours(project.seconds)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico da semana</CardTitle>
          <CardDescription>Todos os apontamentos registrados para esta semana.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {weekEntries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_180px_120px_40px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{entry.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{entry.projectName}</Badge>
                    <span>{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{entry.description || 'Sem observações'}</span>
                <span className="text-sm font-semibold tabular-nums text-primary">{formatDuration(entry.duration)}</span>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeEntry(entry.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
