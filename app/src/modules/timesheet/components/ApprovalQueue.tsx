import { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { useAuthStore } from '@/core/auth/authStore'
import { useTimesheetApprovalQueue, useApproveTimesheetPeriods, useRejectTimesheetPeriods } from '@/core/api/hooks'
import { toast } from 'sonner'

function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ApprovalQueue() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const { data: queue = [], isLoading } = useTimesheetApprovalQueue()
  const approvePeriods = useApproveTimesheetPeriods()
  const rejectPeriods = useRejectTimesheetPeriods()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  if (role !== 'manager' && role !== 'admin') {
    return null
  }

  async function approve(id: string) {
    try {
      await approvePeriods.mutateAsync({ periodIds: [id] })
      toast.success('Semana aprovada')
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Falha ao aprovar semana')
    }
  }

  async function reject(id: string) {
    if (!comment.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    try {
      await rejectPeriods.mutateAsync({ periodIds: [id], comment: comment.trim() })
      toast.success('Semana rejeitada')
      setRejectingId(null)
      setComment('')
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Falha ao rejeitar semana')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovações pendentes</CardTitle>
        <CardDescription>Semanas enviadas pela equipe aguardando sua decisão.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando aprovações…</p>
        ) : queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma semana aguardando aprovação.</p>
        ) : (
          queue.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border/50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium text-foreground">{item.ownerDisplayName}</span>
                  <span className="text-muted-foreground">
                    {' '}• {formatDay(item.periodStart)}–{formatDay(item.periodEnd)} • {formatHours(item.totalSeconds)} • {item.entryCount} registros
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={approvePeriods.isPending} onClick={() => approve(item.id)}>
                    Aprovar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectingId(rejectingId === item.id ? null : item.id); setComment('') }}>
                    Rejeitar
                  </Button>
                </div>
              </div>
              {rejectingId === item.id && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Motivo da rejeição (obrigatório)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button size="sm" variant="destructive" disabled={rejectPeriods.isPending} onClick={() => reject(item.id)}>
                    Confirmar
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
