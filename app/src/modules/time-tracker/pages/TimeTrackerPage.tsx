import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, Clock, ListChecks, Play, Pause, Plus, Square, Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useProjects, useActivities, useTimeEntries, useStartTimeEntry, useCreateManualTimeEntry, usePauseTimeEntry, useResumeTimeEntry, useStopTimeEntry, useDeleteTimeEntry } from '@/core/api/hooks'
import { useTimeTrackerStore } from '@/core/tracker/timeTrackerStore'
import type { UUID, TimeEntryResponse } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select, type SelectOption } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Badge } from '@/shared/components/ui/Badge'
import { Progress } from '@/shared/components/ui/Progress'
import { StatCard } from '@/shared/components/charts/StatCard'
import { formatDuration } from '@/shared/lib/formatters'
import { dateKeyInTimeZone, formatDateInTimeZone, formatTimeInTimeZone, getEffectiveTimeZone, zonedDateTimeToIso } from '@/shared/lib/timezone'
import { toast } from 'sonner'

const DAILY_GOAL_SECONDS = 28800

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`
}

function parseTags(text: string): string[] | undefined {
  const tags = text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return tags.length > 0 ? tags : undefined
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

function getDuration(entry: TimeEntryResponse) {
  if (entry.durationSeconds != null) return entry.durationSeconds
  if (entry.endTime) return Math.max(0, (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000)
  return 0
}

export default function TimeTrackerPage() {
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const timeZone = getEffectiveTimeZone(activeOrg?.timezone)

  const trackerEntry = useTimeTrackerStore((s) => s.entry)
  const trackerRunning = useTimeTrackerStore((s) => s.isRunning)
  const trackerFormatted = useTimeTrackerStore((s) => s.formattedTime)
  const trackerElapsed = useTimeTrackerStore((s) => s.elapsed)
  const trackerStart = useTimeTrackerStore((s) => s.start)
  const trackerPause = useTimeTrackerStore((s) => s.pause)
  const trackerResume = useTimeTrackerStore((s) => s.resume)
  const trackerStop = useTimeTrackerStore((s) => s.stop)
  const trackerSetEntry = useTimeTrackerStore((s) => s.setEntry)

  const { data: projects = [] } = useProjects(orgId as UUID)
  const [projectId, setProjectId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => dateKeyInTimeZone(new Date(), timeZone))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [billable, setBillable] = useState(false)

  const startTimeEntry = useStartTimeEntry()
  const createManualTimeEntry = useCreateManualTimeEntry()
  const stopTimeEntry = useStopTimeEntry()
  const pauseTimeEntry = usePauseTimeEntry()
  const resumeTimeEntry = useResumeTimeEntry()
  const deleteTimeEntry = useDeleteTimeEntry()

  const projectOptions: SelectOption[] = projects
    .filter((p) => p.isActive)
    .map((p) => ({ value: p.id, label: p.name }))

  const { data: activities = [] } = useActivities(projectId as UUID)
  const activityOptions: SelectOption[] = activities.map((a) => ({ value: a.id, label: a.title }))
  const projectName = projects.find((p) => p.id === projectId)?.name ?? 'Projeto'
  const trackerProjectName = projects.find((p) => p.id === trackerEntry?.projectId)?.name ?? 'Projeto'

  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())
  const { data: entries = [] } = useTimeEntries({
    from: zonedDateTimeToIso(dateKeyInTimeZone(weekStart, timeZone), '00:00', timeZone),
    to: zonedDateTimeToIso(dateKeyInTimeZone(weekEnd, timeZone), '23:59', timeZone),
  })

  const today = dateKeyInTimeZone(new Date(), timeZone)
  const todayEntries = useMemo(
    () => entries.filter((entry) => dateKeyInTimeZone(entry.startTime, timeZone) === today),
    [entries, timeZone, today],
  )

  const effectiveDuration = (entry: TimeEntryResponse) => entry.id === trackerEntry?.id ? trackerElapsed : getDuration(entry)
  const trackerMissingFromList = !!trackerEntry && !entries.some((entry) => entry.id === trackerEntry.id)
  const trackerIsThisWeek = !!trackerEntry
    && Date.parse(trackerEntry.startTime) >= weekStart.getTime()
    && Date.parse(trackerEntry.startTime) <= weekEnd.getTime()
  const trackerExtra = trackerMissingFromList && trackerIsThisWeek ? trackerElapsed : 0
  const totalToday = todayEntries.reduce((sum, entry) => sum + effectiveDuration(entry), 0)
    + (trackerMissingFromList && trackerEntry && dateKeyInTimeZone(trackerEntry.startTime, timeZone) === today ? trackerElapsed : 0)
  const totalWeek = entries.reduce((sum, entry) => sum + effectiveDuration(entry), 0) + trackerExtra
  const progressToday = Math.min((totalToday / DAILY_GOAL_SECONDS) * 100, 100)

  const projectTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of entries) {
      const name = projects.find((p) => p.id === entry.projectId)?.name ?? 'Projeto'
      map.set(name, (map.get(name) ?? 0) + effectiveDuration(entry))
    }
    if (trackerExtra && trackerEntry) {
      const name = projects.find((p) => p.id === trackerEntry.projectId)?.name ?? 'Projeto'
      map.set(name, (map.get(name) ?? 0) + trackerExtra)
    }
    return Array.from(map.entries())
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
  }, [entries, projects, trackerElapsed, trackerEntry, trackerExtra])

  async function addManualEntry() {
    if (!projectId) return
    const startISO = zonedDateTimeToIso(date, startTime || '09:00', timeZone)
    const endISO = zonedDateTimeToIso(date, endTime || '10:00', timeZone)
    const duration = Math.round((Date.parse(endISO) - Date.parse(startISO)) / 1000)
    if (duration <= 0) {
      toast.error('O horário final deve ser depois do início')
      return
    }

    try {
      await createManualTimeEntry.mutateAsync({
        projectId: projectId as UUID,
        activityId: activityId || undefined,
        description: description.trim() || title.trim() || undefined,
        billable,
        tags: parseTags(tagsText),
        startTime: startISO,
        endTime: endISO,
      })
      toast.success('Apontamento salvo')
      setTitle('')
      setDescription('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar apontamento')
    }
  }

  async function startTimer() {
    if (!projectId) return
    try {
      const entry = await startTimeEntry.mutateAsync({
        projectId: projectId as UUID,
        activityId: activityId || undefined,
        description: description.trim() || undefined,
        billable,
        tags: parseTags(tagsText),
      })
      trackerStart(entry)
      toast.success('Timer iniciado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao iniciar timer')
    }
  }

  async function stopTimer() {
    const entry = useTimeTrackerStore.getState().entry
    if (!entry) return
    try {
      await stopTimeEntry.mutateAsync(entry.id)
      trackerStop()
      toast.success('Tempo registrado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao parar timer')
    }
  }

  async function pauseTimer() {
    const entry = useTimeTrackerStore.getState().entry
    if (!entry) return
    try {
      const updated = await pauseTimeEntry.mutateAsync(entry.id)
      trackerPause()
      trackerSetEntry(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao pausar timer')
    }
  }

  async function resumeTimer() {
    const entry = useTimeTrackerStore.getState().entry
    if (!entry) return
    try {
      const updated = await resumeTimeEntry.mutateAsync(entry.id)
      trackerResume()
      trackerSetEntry(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao continuar timer')
    }
  }

  async function removeEntry(entryId: string) {
    try {
      await deleteTimeEntry.mutateAsync(entryId as UUID)
      toast.success('Registro removido')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover registro')
    }
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
        <StatCard value={entries.length} label="Registros" icon={ListChecks} formatValue={(v) => String(Math.round(v))} />
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
                placeholder="Selecione um projeto"
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
              <Input label="Início" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="Fim" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>

            <Textarea
              label="Observações"
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Tags (separadas por vírgula)"
                placeholder="Ex: dev, backend, urgente"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
              />
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={billable}
                  onChange={(e) => setBillable(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span className="text-muted-foreground">Computar em relatórios</span>
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Timer rápido</p>
                <p className="text-xs text-muted-foreground">
                  {trackerEntry ? `${trackerProjectName} • ${trackerFormatted}` : 'Inicie o cronômetro quando for trabalhar em tempo real.'}
                </p>
              </div>
              <div className="flex gap-2">
                {trackerEntry && (
                  <Button variant="outline" onClick={trackerRunning ? pauseTimer : resumeTimer}>
                    {trackerRunning ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                    {trackerRunning ? 'Pausar' : 'Continuar'}
                  </Button>
                )}
                <Button variant="outline" onClick={trackerEntry ? stopTimer : startTimer} disabled={startTimeEntry.isPending}>
                  {trackerEntry ? <Square className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                  {trackerEntry ? 'Parar e salvar' : 'Iniciar timer'}
                </Button>
                <Button onClick={addManualEntry} disabled={!projectId || createManualTimeEntry.isPending}>
                  {createManualTimeEntry.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
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
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_180px_120px_40px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.description || projects.find((p) => p.id === entry.projectId)?.name || 'Apontamento'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">
                      {projects.find((p) => p.id === entry.projectId)?.name ?? 'Projeto'}
                    </Badge>
                    <span>{formatDateInTimeZone(entry.startTime, timeZone)}</span>
                    {entry.endTime == null && <Badge className="text-[10px]">Em andamento</Badge>}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {entry.endTime ? `${formatTimeInTimeZone(entry.startTime, timeZone)} - ${formatTimeInTimeZone(entry.endTime, timeZone)}` : '—'}
                </span>
                <span className="text-sm font-semibold tabular-nums text-primary">{formatDuration(effectiveDuration(entry))}</span>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => removeEntry(entry.id)} disabled={deleteTimeEntry.isPending}>
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
