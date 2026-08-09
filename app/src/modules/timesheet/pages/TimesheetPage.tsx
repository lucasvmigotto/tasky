import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Clock,
  Trash2,
  GripVertical,
  Timer,
  ArrowRight,
  FileText,
  Ticket,
  Loader2,
  FolderKanban,
  Search,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Separator } from '@/shared/components/ui/Separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/components/ui/Tooltip'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { cn } from '@/shared/lib/cn'
import { useHoursMask, hoursToMaskDigits } from '@/shared/hooks/useHoursMask'
import { useAuthStore } from '@/core/auth/authStore'
import { useTimeEntries, useProjects, useCreateManualTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry } from '@/core/api/hooks'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { toast } from 'sonner'
import type { UUID } from '@/core/api/types'
import { dateKeyInTimeZone, getEffectiveTimeZone, zonedDateTimeToIso } from '@/shared/lib/timezone'
import { useTimeTrackerStore } from '@/core/tracker/timeTrackerStore'

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
const FULL_DAY_NAMES = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

const FALLBACK_PROJECT_COLOR = '#64748B'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateDDMM(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function getWeekDateRangeLabel(weekStart: Date): string {
  const start = weekStart
  const end = addDays(weekStart, 6)
  return `${formatDateShort(start)} – ${formatDateShort(end)}`
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function decimalToHHMM(value: number): string {
  if (value === 0) return ''
  const totalMinutes = Math.round(value * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function HHMMToDecimal(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (trimmed.includes(':')) {
    const [hStr, mStr] = trimmed.split(':')
    const h = parseInt(hStr, 10) || 0
    const m = parseInt(mStr, 10) || 0
    return h + m / 60
  }
  if (trimmed.includes('h') || trimmed.includes('m')) {
    const hMatch = trimmed.match(/(\d+)\s*h/i)
    const mMatch = trimmed.match(/(\d+)\s*m/i)
    const h = hMatch ? parseInt(hMatch[1], 10) : 0
    const m = mMatch ? parseInt(mMatch[1], 10) : 0
    return h + m / 60
  }
  const comma = trimmed.replace(',', '.')
  const parsed = parseFloat(comma)
  return isNaN(parsed) ? 0 : parsed
}

export default function TimesheetPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()))
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null
  const timeZone = getEffectiveTimeZone(activeOrg?.timezone)
  const trackerEntry = useTimeTrackerStore((s) => s.entry)
  const trackerElapsed = useTimeTrackerStore((s) => s.elapsed)

  const weekEnd = useMemo(() => {
    const end = new Date(currentWeekStart)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [currentWeekStart])

  const queryRange = useMemo(() => ({
    from: zonedDateTimeToIso(dateKeyInTimeZone(currentWeekStart, timeZone), '00:00', timeZone),
    to: zonedDateTimeToIso(dateKeyInTimeZone(weekEnd, timeZone), '23:59', timeZone),
  }), [currentWeekStart, timeZone, weekEnd])

  const { data: projects } = useProjects(orgId as UUID)
  const { data: timeEntries = [] } = useTimeEntries(
    orgId ? queryRange : null
  )
  const createManualTimeEntry = useCreateManualTimeEntry()
  const updateTimeEntry = useUpdateTimeEntry()
  const deleteTimeEntry = useDeleteTimeEntry()

  const [entries, setEntries] = useState<any[]>([])
  const [extraRows, setExtraRows] = useState<{ id: string; projectId: string }[]>([])

  // Sync API time entries into the grid
  useEffect(() => {
    const mapped = timeEntries.map((e) => ({
      id: e.id,
      projectId: e.projectId ?? '',
      date: dateKeyInTimeZone(e.startTime, timeZone),
      hours: parseFloat((((e.id === trackerEntry?.id ? trackerElapsed : e.durationSeconds) ?? 0) / 3600).toFixed(2)),
      description: e.description || 'Sem descrição',
      glpiTicketId: e.glpiTicketId,
      startTime: e.startTime,
      endTime: e.endTime,
    }))
    setEntries(mapped)
  }, [timeEntries, timeZone, trackerElapsed, trackerEntry?.id])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProjectId, setModalProjectId] = useState('')
  const [modalProjectName, setModalProjectName] = useState('')
  const [modalDayIndex, setModalDayIndex] = useState(0)
  const [modalDate, setModalDate] = useState('')

  // Confirmação de exclusão (apontamento ou dia inteiro)
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'entry'; entryId: string } | { kind: 'day'; projectId: string; date: string } | null
  >(null)

  // Form state (add + edit use the same form)
  const [formDescription, setFormDescription] = useState('')
  const [formGlpiTicketId, setFormGlpiTicketId] = useState('')
  const hoursMask = useHoursMask()

  // Entry being edited (null = adding a new one)
  const [editingEntry, setEditingEntry] = useState<any | null>(null)

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])

  const weekDatesISO = useMemo(() => weekDates.map((d) => dateKeyInTimeZone(d, timeZone)), [timeZone, weekDates])

  const weekLabel = getWeekDateRangeLabel(currentWeekStart)

  const projectList = useMemo(() => {
    const ids = [...new Set([...entries.map((e) => e.projectId), ...extraRows.map((r) => r.projectId)])]
    return ids.map((id) => {
      const p = projects?.find((proj) => proj.id === id)
      return { id, name: p?.name ?? 'Desconhecido', color: p?.color ?? FALLBACK_PROJECT_COLOR }
    })
  }, [entries, extraRows, projects])

  const allProjects = useMemo(() => {
    const existingIds = new Set([...entries.map((e) => e.projectId), ...extraRows.map((r) => r.projectId)])
    return (projects ?? [])
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({ value: p.id, label: p.name, color: p.color }))
  }, [entries, extraRows, projects])

  const projectNameById = (id: string) => projects?.find((p) => p.id === id)?.name ?? 'projeto'

  const orderedAddProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    return allProjects
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter((p) => !q || p.label.toLowerCase().includes(q))
  }, [allProjects, projectSearch])

  function getEntries(projectId: string, date: string): any[] {
    return entries.filter((e) => e.projectId === projectId && e.date === date)
  }

  function getTotal(projectId: string, date: string): number {
    return getEntries(projectId, date).reduce((sum, e) => sum + e.hours, 0)
  }

  const totalPerDay = useMemo(() => {
    return weekDatesISO.map((date) =>
      projectList.reduce((sum, p) => sum + getTotal(p.id, date), 0),
    )
  }, [entries, weekDatesISO, projectList])

  const totalPerRow = useMemo(() => {
    return projectList.map((p) =>
      weekDatesISO.reduce((sum, date) => sum + getTotal(p.id, date), 0),
    )
  }, [entries, weekDatesISO, projectList])

  const grandTotal = useMemo(() => totalPerRow.reduce((s, t) => s + t, 0), [totalPerRow])

  const goPreviousWeek = useCallback(() => setCurrentWeekStart((p) => addDays(p, -7)), [])
  const goNextWeek = useCallback(() => setCurrentWeekStart((p) => addDays(p, 7)), [])
  const goCurrentWeek = useCallback(() => setCurrentWeekStart(startOfWeek(new Date())), [])

  function openCellModal(projectId: string, projectName: string, dayIndex: number) {
    const date = weekDatesISO[dayIndex]
    setModalProjectId(projectId)
    setModalProjectName(projectName)
    setModalDayIndex(dayIndex)
    setModalDate(date)

    const existing = getEntries(projectId, date)
      .slice()
      .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)))
    if (existing.length > 0) {
      loadEntryIntoForm(existing[0])
    } else {
      setEditingEntry(null)
      setFormDescription('')
      setFormGlpiTicketId('')
      hoursMask.reset()
    }
    setModalOpen(true)
  }

  function loadEntryIntoForm(entry: any) {
    setEditingEntry(entry)
    setFormDescription(entry.description === 'Sem descrição' ? '' : entry.description)
    setFormGlpiTicketId(entry.glpiTicketId ?? '')
    hoursMask.setDigits(hoursToMaskDigits(entry.hours || 0))
  }

  async function addEntry() {
    const hours = hoursMask.getDecimal()
    if (hours <= 0 || !modalProjectId) return
    try {
      const startTime = zonedDateTimeToIso(modalDate, '09:00', timeZone)
      const end = new Date(startTime)
      end.setSeconds(end.getSeconds() + hours * 3600)
      await createManualTimeEntry.mutateAsync({
        projectId: modalProjectId,
        description: formDescription.trim() || 'Sem descrição',
        glpiTicketId: formGlpiTicketId.trim() || undefined,
        startTime,
        endTime: end.toISOString(),
      })
      toast.success('Horas adicionadas')
      setEditingEntry(null)
      setFormDescription('')
      setFormGlpiTicketId('')
      hoursMask.reset()
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao adicionar registro')
    }
  }

  function requestDeleteEntry(entryId: string) {
    setConfirmDelete({ kind: 'entry', entryId })
  }

  function requestDeleteDay(projectId: string, date: string) {
    setConfirmDelete({ kind: 'day', projectId, date })
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return
    try {
      if (confirmDelete.kind === 'entry') {
        await deleteTimeEntry.mutateAsync(confirmDelete.entryId)
      } else {
        const ids = getEntries(confirmDelete.projectId, confirmDelete.date).map((e) => e.id)
        await Promise.all(ids.map((id) => deleteTimeEntry.mutateAsync(id)))
      }
      toast.success('Excluído com sucesso')
      setConfirmDelete(null)
      setEditingEntry(null)
      setFormDescription('')
      setFormGlpiTicketId('')
      hoursMask.reset()
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao excluir')
    }
  }

  function openEdit(entry: any) {
    loadEntryIntoForm(entry)
  }

  async function saveEdit() {
    if (!editingEntry) return
    const hours = hoursMask.getDecimal()
    if (hours <= 0) {
      toast.error('Informe uma quantidade de horas válida')
      return
    }
    try {
      const startTime = editingEntry.startTime
      const end = new Date(startTime)
      end.setSeconds(end.getSeconds() + hours * 3600)
      await updateTimeEntry.mutateAsync({
        entryId: editingEntry.id,
        data: {
          description: formDescription.trim() || undefined,
          glpiTicketId: formGlpiTicketId.trim() || undefined,
          startTime,
          endTime: end.toISOString(),
        },
      })
      toast.success('Registro atualizado')
      setEditingEntry(null)
      setFormDescription('')
      setFormGlpiTicketId('')
      hoursMask.reset()
      setModalOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar registro')
    }
  }

  function selectProjectToAdd(projectId: string) {
    if (!projectId) return
    if (extraRows.some((r) => r.projectId === projectId)) return
    setExtraRows((prev) => [...prev, { id: `row-${Date.now()}`, projectId }])
    setProjectSearch('')
    setAddProjectOpen(false)
  }

  function removeProjectRow(projectId: string) {
    setExtraRows((prev) => prev.filter((r) => r.projectId !== projectId))
  }

  const modalEntries = modalOpen ? getEntries(modalProjectId, modalDate) : []
  const modalTotal = modalEntries.reduce((s, e) => s + e.hours, 0)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-foreground">Minha Semana</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Semana de {weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goCurrentWeek}>
            Hoje
          </Button>
          <div className="flex items-center rounded-lg border border-border bg-card">
            <Button variant="ghost" size="icon" className="size-8 rounded-none rounded-l-lg" onClick={goPreviousWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[140px] px-3 text-center text-sm font-medium text-foreground tabular-nums">
              {weekLabel}
            </span>
            <Button variant="ghost" size="icon" className="size-8 rounded-none rounded-r-lg" onClick={goNextWeek}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Planilha */}
      <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="sticky left-0 z-10 w-[220px] bg-muted/30 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-3.5 text-muted-foreground/40" />
                    Projeto
                  </div>
                </th>
                {weekDates.map((date, i) => {
                  const today = isToday(date)
                  return (
                    <th key={i} className={cn('min-w-[88px] px-2 py-3 text-center', today && 'bg-[#1e3a5f]/30')}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', today ? 'text-[#60a5fa]' : 'text-muted-foreground')}>
                          {DAY_NAMES[i]}
                        </span>
                        <span className={cn('text-[11px]', today ? 'text-[#60a5fa] font-semibold' : 'text-muted-foreground/60')}>
                          {formatDateDDMM(date)}
                        </span>
                        {today && <Badge variant="info" className="mt-0.5 h-4 px-1 py-0 text-[9px]">Hoje</Badge>}
                      </div>
                    </th>
                  )
                })}
                <th className="min-w-[80px] px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {projectList.map((project, rowIndex) => {
                  const rowTotal = totalPerRow[rowIndex]
                  const color = project.color

                  return (
                    <motion.tr
                      key={project.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15, delay: rowIndex * 0.03 }}
                      className="group border-b border-border/20 transition-colors hover:bg-muted/20"
                    >
                      {/* Projeto */}
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                        <div className="flex items-center gap-3">
                           <div className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">{project.name}</span>
                            <span className="text-[10px] text-muted-foreground/60">{decimalToHHMM(rowTotal)} esta semana</span>
                          </div>
                        </div>
                      </td>

                      {/* Células */}
                      {weekDatesISO.map((date, dayIndex) => {
                        const today = isToday(weekDates[dayIndex])
                        const cellEntries = getEntries(project.id, date)
                        const total = cellEntries.reduce((s, e) => s + e.hours, 0)
                        const hasValue = total > 0
                        const count = cellEntries.length

                        return (
                          <td
                            key={dayIndex}
                            className={cn('relative px-1.5 py-2', today && 'bg-[#1e3a5f]/10')}
                            onClick={() => openCellModal(project.id, project.name, dayIndex)}
                          >
                            <div
                              className={cn(
                                'group/cell relative flex h-10 flex-col items-center justify-center rounded-md border px-2 text-sm tabular-nums outline-none transition-all',
                                hasValue
                                  ? 'border-border/60 bg-muted/30 font-medium text-foreground'
                                  : 'border-border/20 bg-transparent text-muted-foreground/30',
                                'cursor-pointer hover:border-border/50 hover:bg-muted/20',
                                today && hasValue && 'border-[#3b82f6]/30',
                              )}
                            >
                              <span className={cn(hasValue ? 'text-foreground' : 'text-muted-foreground/30')}>
                                {hasValue ? decimalToHHMM(total) : '+'}
                              </span>
                              {count > 1 && (
                                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground">
                                  {count}
                                </span>
                              )}
                              {hasValue && (
                                 <div className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full" style={{ backgroundColor: color }} />
                              )}
                            </div>
                            {hasValue && (
                              <button
                                type="button"
                                title="Excluir horas deste dia"
                                aria-label={`Excluir horas de ${project.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  requestDeleteDay(project.id, date)
                                }}
                                className="absolute right-0.5 top-0.5 z-10 flex size-5 items-center justify-center rounded text-muted-foreground/30 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </td>
                        )
                      })}

                      {/* Total linha */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('text-sm font-bold tabular-nums', rowTotal > 0 ? 'text-foreground' : 'text-muted-foreground/30')}>
                          {decimalToHHMM(rowTotal)}
                        </span>
                      </td>

                      {/* Remover */}
                      <td className="px-2 py-2.5">
                        {extraRows.some((row) => row.projectId === project.id) && !entries.some((entry) => entry.projectId === project.id) && (
                          <button
                            type="button"
                            aria-label={`Remover linha do projeto ${project.name}`}
                            onClick={() => removeProjectRow(project.id)}
                            className="flex size-8 items-center justify-center rounded-md text-muted-foreground/20 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>

              {/* Total geral */}
              <tr className="border-t-2 border-border/40 bg-muted/20 font-semibold">
                <td className="sticky left-0 z-10 bg-muted/20 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    <span className="text-sm text-foreground">Total</span>
                  </div>
                </td>
                {totalPerDay.map((total, i) => {
                  const today = isToday(weekDates[i])
                  return (
                    <td key={i} className={cn('px-1.5 py-3.5 text-center', today && 'bg-[#1e3a5f]/10')}>
                      <span className={cn('text-sm font-bold tabular-nums', total > 0 ? (today ? 'text-[#60a5fa]' : 'text-foreground') : 'text-muted-foreground/30')}>
                        {decimalToHHMM(total)}
                      </span>
                    </td>
                  )
                })}
                <td className="px-3 py-3.5 text-center">
                  <span className="text-base font-extrabold tabular-nums text-primary">{decimalToHHMM(grandTotal)}</span>
                </td>
                <td className="px-2 py-3.5" />
              </tr>
            </tbody>
          </table>
        </div>

        <Separator className="bg-border/30" />
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => { setProjectSearch(''); setAddProjectOpen(true) }} disabled={allProjects.length === 0} className="text-muted-foreground hover:text-foreground">
            <Plus className="mr-1.5 size-4" /> Adicionar projeto
          </Button>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{projectList.length} projeto{projectList.length !== 1 ? 's' : ''}</span>
            <span className="text-border">|</span>
            <span className="tabular-nums">Média: {grandTotal > 0 ? (grandTotal / Math.max(totalPerDay.filter((t) => t > 0).length, 1)).toFixed(1) : '0'}h/dia útil</span>
          </div>
        </div>
      </Card>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-primary" /> Total da semana
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{decimalToHHMM(grandTotal)}</div>
          </div>
        </Card>
        <Card className="border-border/40">
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3.5" /> Dias trabalhados
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{totalPerDay.filter((t) => t > 0).length} / 7</div>
          </div>
        </Card>
        <Card className="border-border/40">
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="size-3.5" /> Média diária
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{grandTotal > 0 ? (grandTotal / 7).toFixed(1) : '0'}h</div>
          </div>
        </Card>
        <Card className="border-border/40">
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="size-3.5" /> Maior dia
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{decimalToHHMM(Math.max(...totalPerDay, 0))}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/60">{FULL_DAY_NAMES[totalPerDay.indexOf(Math.max(...totalPerDay, 0))] || '—'}</div>
          </div>
        </Card>
      </div>

      {/* Modal de entradas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
               <div className="size-2.5 rounded-full" style={{ backgroundColor: projectList.find((p) => p.id === modalProjectId)?.color ?? FALLBACK_PROJECT_COLOR }} />
              {modalProjectName}
            </DialogTitle>
            <DialogDescription>
              {FULL_DAY_NAMES[modalDayIndex]}, {formatDateDDMM(weekDates[modalDayIndex] ?? new Date())} — {decimalToHHMM(modalTotal)} registrados
            </DialogDescription>
          </DialogHeader>

          {/* Lista de entradas */}
          <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
            {modalEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FileText className="mb-2 size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum registro neste dia</p>
                <p className="text-xs text-muted-foreground/60">Adicione uma entrada abaixo</p>
              </div>
            ) : (
              modalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-start justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 transition-colors hover:bg-muted/30',
                    editingEntry?.id === entry.id && 'border-primary/40 bg-primary/5',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="min-w-0 flex-1 text-left"
                    title="Editar registro"
                  >
                    <p className="text-sm font-medium text-foreground">{entry.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold tabular-nums text-primary">{decimalToHHMM(entry.hours)}</span>
                      {entry.glpiTicketId && (
                        <span className="inline-flex items-center gap-1">
                          <Ticket className="size-3" />
                          #{entry.glpiTicketId}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteEntry(entry.id)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir registro"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <Separator className="my-1" />

          {/* Formulário nova entrada */}
          <div className="space-y-3">
            <Input
              label="Horas"
              placeholder="00:00"
              inputMode="numeric"
              value={hoursMask.value}
              onChange={hoursMask.handleChange}
              onKeyDown={hoursMask.handleKeyDown}
              onFocus={hoursMask.handleFocus}
              onPaste={hoursMask.handlePaste}
              className="font-mono tabular-nums tracking-wider text-lg text-center"
            />
            <Textarea
              label="Descrição"
              placeholder="O que você fez?"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="min-h-[60px]"
            />
            <Input
              label="Chamado GLPI (opcional)"
              placeholder="Ex.: 1234"
              value={formGlpiTicketId}
              onChange={(e) => setFormGlpiTicketId(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              {editingEntry && (
                <Button variant="destructive" size="sm" onClick={() => requestDeleteEntry(editingEntry.id)}>
                  <Trash2 className="mr-1 size-3.5" /> Excluir
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
              {editingEntry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingEntry(null)
                    setFormDescription('')
                    setFormGlpiTicketId('')
                    hoursMask.reset()
                  }}
                >
                  Cancelar edição
                </Button>
              )}
              {editingEntry ? (
                <Button size="sm" onClick={saveEdit} disabled={updateTimeEntry.isPending || !hoursMask.digits}>
                  Atualizar
                </Button>
              ) : (
                <Button size="sm" onClick={addEntry} disabled={!hoursMask.digits}>
                  <Plus className="mr-1 size-3.5" /> Adicionar registro
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir horas?</DialogTitle>
            <DialogDescription>
              {confirmDelete?.kind === 'day'
                ? `As horas de ${projectNameById(confirmDelete.projectId)} no dia ${formatDateDDMM(new Date(confirmDelete.date))} serão excluídas (${getEntries(confirmDelete.projectId, confirmDelete.date).length} registro(s)). Esta ação não pode ser desfeita.`
                : 'Este apontamento será excluído. Esta ação não pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete} disabled={deleteTimeEntry.isPending}>
              {deleteTimeEntry.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adicionar projeto */}
      <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar projeto</DialogTitle>
            <DialogDescription>
              {allProjects.length === 0
                ? 'Escolha um projeto para lançar horas nesta semana.'
                : `${allProjects.length} projeto${allProjects.length !== 1 ? 's' : ''} disponíve${allProjects.length !== 1 ? 'is' : 'l'}.`}
            </DialogDescription>
          </DialogHeader>
          {allProjects.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={FolderKanban}
                title="Nenhum projeto disponível"
                description="Todos os projetos já estão na sua semana."
              />
            </div>
          ) : (
            <>
              <div className="relative mt-4">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar projeto..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Separator className="my-4" />
              {orderedAddProjects.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Nenhum projeto encontrado"
                  description={`Nada corresponde a "${projectSearch}".`}
                />
              ) : (
                <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
                  {orderedAddProjects.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => selectProjectToAdd(p.value)}
                      className="flex items-center gap-3 rounded-lg border border-border/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="flex-1 truncate text-sm font-medium text-foreground">{p.label}</span>
                      <Plus className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
