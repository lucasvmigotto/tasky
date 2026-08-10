import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Square, Timer } from 'lucide-react'
import { useTimeTrackerStore } from '@/core/tracker/timeTrackerStore'
import { useAuthStore } from '@/core/auth/authStore'
import { usePauseTimeEntry, useProjects, useResumeTimeEntry, useRunningTimeEntry, useStopTimeEntry } from '@/core/api/hooks'
import { ROUTES } from '@/core/config/routes'
import { Button } from '@/shared/components/ui/Button'
import { toast } from 'sonner'

export function TimeTrackerWidget() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const orgId = useAuthStore((s) => s.activeOrg?.id ?? null)
  const { data: projects = [] } = useProjects(orgId)
  const { data: running, refetch } = useRunningTimeEntry()
  const stopTimeEntry = useStopTimeEntry()
  const pauseTimeEntry = usePauseTimeEntry()
  const resumeTimeEntry = useResumeTimeEntry()

  const entry = useTimeTrackerStore((s) => s.entry)
  const formattedTime = useTimeTrackerStore((s) => s.formattedTime)
  const isRunning = useTimeTrackerStore((s) => s.isRunning)
  const setEntry = useTimeTrackerStore((s) => s.setEntry)
  const pause = useTimeTrackerStore((s) => s.pause)
  const resume = useTimeTrackerStore((s) => s.resume)
  const stop = useTimeTrackerStore((s) => s.stop)
  const projectName = projects.find((project) => project.id === entry?.projectId)?.name

  useEffect(() => {
    if (isAuthenticated && running && !useTimeTrackerStore.getState().entry) {
      setEntry(running)
    }
  }, [isAuthenticated, running, setEntry])

  async function handleStop() {
    const active = useTimeTrackerStore.getState().entry
    if (!active) return
    try {
      await stopTimeEntry.mutateAsync(active.id)
      stop()
      toast.success('Tempo registrado')
      refetch()
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao parar o timer')
    }
  }

  async function handlePause() {
    const active = useTimeTrackerStore.getState().entry
    if (!active) return
    try {
      const updated = await pauseTimeEntry.mutateAsync(active.id)
      pause()
      setEntry(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao pausar o timer')
    }
  }

  async function handleResume() {
    const active = useTimeTrackerStore.getState().entry
    if (!active) return
    try {
      const updated = await resumeTimeEntry.mutateAsync(active.id)
      resume()
      setEntry(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao continuar o timer')
    }
  }

  if (!entry) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate(ROUTES.TIME_TRACKER)}>
        <Timer className="size-4" />
        <span className="hidden sm:inline">Timer</span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1">
      <Timer className="size-4 text-primary" />
      <span className="font-mono text-xs font-semibold tabular-nums text-primary">{formattedTime}</span>
      <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
        {projectName ?? entry.description ?? 'Tempo registrado'}
      </span>
      {isRunning ? (
        <Button variant="ghost" size="icon" className="size-7" onClick={handlePause} title="Pausar">
          <Pause className="size-3.5" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="size-7" onClick={handleResume} title="Continuar">
          <Play className="size-3.5" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={handleStop} title="Parar e salvar">
        <Square className="size-3.5" />
      </Button>
    </div>
  )
}
