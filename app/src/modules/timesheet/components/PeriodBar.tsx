import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useAuthStore } from '@/core/auth/authStore'
import {
  useTimesheetPeriods,
  useCreateTimesheetPeriod,
  useSubmitTimesheetPeriod,
  useReopenTimesheetPeriod,
  useCloseTimesheetPeriod,
} from '@/core/api/hooks'
import type { TimesheetPeriodResponse, TimesheetPeriodStatus } from '@/core/api/types'
import { toast } from 'sonner'

const STATUS_LABEL: Record<TimesheetPeriodStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Aguardando aprovação',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  LOCKED: 'Fechada',
}

const STATUS_VARIANT: Record<TimesheetPeriodStatus, 'secondary' | 'info' | 'success' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'destructive',
  LOCKED: 'outline',
}

function failMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

export default function PeriodBar({ weekStartISO, weekEndISO }: { weekStartISO: string; weekEndISO: string }) {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const isApprover = role === 'manager' || role === 'admin'
  const { data: periods = [], isLoading } = useTimesheetPeriods({ from: weekStartISO, to: weekEndISO })
  const period: TimesheetPeriodResponse | null = periods[0] ?? null

  const createPeriod = useCreateTimesheetPeriod()
  const submitPeriod = useSubmitTimesheetPeriod()
  const reopenPeriod = useReopenTimesheetPeriod()
  const closePeriod = useCloseTimesheetPeriod()
  const busy = createPeriod.isPending || submitPeriod.isPending || reopenPeriod.isPending || closePeriod.isPending

  async function run(action: Promise<unknown>, ok: string, fallback: string) {
    try {
      await action
      toast.success(ok)
    } catch (e) {
      toast.error(failMessage(e, fallback))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
      <span className="text-sm font-medium text-foreground">Semana</span>
      {isLoading ? (
        <span className="text-sm text-muted-foreground">Carregando período…</span>
      ) : !period ? (
        <>
          <span className="text-sm text-muted-foreground">Nenhum período aberto.</span>
          <Button size="sm" disabled={busy} onClick={() => run(createPeriod.mutateAsync({ periodStart: weekStartISO }), 'Semana aberta', 'Falha ao abrir semana')}>
            Abrir semana
          </Button>
        </>
      ) : (
        <>
          <Badge variant={STATUS_VARIANT[period.status]}>{STATUS_LABEL[period.status]}</Badge>
          {period.status === 'REJECTED' && period.rejectionComment && (
            <span className="text-sm text-muted-foreground">Motivo: {period.rejectionComment}</span>
          )}
          {period.status === 'DRAFT' && (
            <Button size="sm" disabled={busy} onClick={() => run(submitPeriod.mutateAsync(period.id), 'Semana enviada para aprovação', 'Falha ao enviar semana')}>
              Enviar para aprovação
            </Button>
          )}
          {(period.status === 'SUBMITTED' || period.status === 'REJECTED' || (period.status === 'LOCKED' && isApprover)) && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(reopenPeriod.mutateAsync(period.id), 'Semana reaberta', 'Falha ao reabrir semana')}>
              Reabrir
            </Button>
          )}
          {period.status === 'APPROVED' && isApprover && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(closePeriod.mutateAsync(period.id), 'Semana fechada', 'Falha ao fechar semana')}>
              Fechar semana
            </Button>
          )}
        </>
      )}
    </div>
  )
}
