import { useMemo, useState } from 'react'
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  MessageSquareX,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useTimesheetApprovalQueue,
  useApproveTimesheetPeriods,
  useRejectTimesheetPeriods,
  useCloseTimesheetPeriod,
} from '@/core/api/hooks'
import type { TimesheetPeriodQueueItem } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { QueryState } from '@/shared/components/feedback/QueryState'
import { formatDate, formatDuration } from '@/shared/lib/formatters'

const PAGE_SIZE = 8

function formatPeriodRange(item: TimesheetPeriodQueueItem): string {
  return `${formatDate(item.periodStart)} – ${formatDate(item.periodEnd)}`
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function TimesheetApprovalsPage() {
  const { data: queue = [], isLoading, error } = useTimesheetApprovalQueue()
  const approvePeriods = useApproveTimesheetPeriods()
  const rejectPeriods = useRejectTimesheetPeriods()
  const closePeriod = useCloseTimesheetPeriod()

  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [closingId, setClosingId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(queue.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const visibleItems = useMemo(
    () => queue.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [queue, currentPage],
  )

  const selectedIds = useMemo(() => queue.map((item) => item.id).filter((id) => selected.has(id)), [queue, selected])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      const pageIds = visibleItems.map((item) => item.id)
      const allSelected = pageIds.every((id) => next.has(id))
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  async function handleApprove() {
    if (selectedIds.length === 0) return
    try {
      await approvePeriods.mutateAsync({ periodIds: selectedIds })
      toast.success(`${selectedIds.length} período(s) aprovado(s)`)
      setSelected(new Set())
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao aprovar períodos')
    }
  }

  async function handleReject() {
    if (selectedIds.length === 0 || !rejectComment.trim()) return
    try {
      await rejectPeriods.mutateAsync({ periodIds: selectedIds, comment: rejectComment.trim() })
      toast.success(`${selectedIds.length} período(s) rejeitado(s)`)
      setSelected(new Set())
      setRejectOpen(false)
      setRejectComment('')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao rejeitar períodos')
    }
  }

  async function handleClose(id: string) {
    setClosingId(id)
    try {
      await closePeriod.mutateAsync(id)
      toast.success('Período fechado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao fechar período')
    } finally {
      setClosingId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Aprovações de Horas"
        description="Períodos enviados pelos colaboradores aguardando aprovação"
      />

      <QueryState isLoading={isLoading} error={error} isEmpty={queue.length === 0}>
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedIds.length > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">{selectedIds.length}</span> período(s) selecionado(s)
                  </>
                ) : (
                  <>Fila de aprovação: <span className="font-semibold text-foreground">{queue.length}</span> período(s)</>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={selectedIds.length === 0 || approvePeriods.isPending}
                >
                  {approvePeriods.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCheck className="mr-1.5 size-4" />}
                  Aprovar selecionados
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={selectedIds.length === 0}
                >
                  <X className="mr-1.5 size-4" />
                  Rejeitar selecionados
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos da página"
                        checked={visibleItems.length > 0 && visibleItems.every((item) => selected.has(item.id))}
                        onChange={toggleAll}
                        className="size-4 accent-primary"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Colaborador</th>
                    <th className="px-4 py-3 font-medium">Período</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Computadas</th>
                    <th className="px-4 py-3 font-medium">Registros</th>
                    <th className="px-4 py-3 font-medium">Enviado em</th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar período de ${item.ownerDisplayName}`}
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                          className="size-4 accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{item.ownerDisplayName}</span>
                          <span className="text-xs text-muted-foreground">{item.ownerUsername}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatPeriodRange(item)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-foreground">{formatDuration(item.totalSeconds)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatHours(item.billableSeconds)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{item.entryCount}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(item.submittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClose(item.id)}
                          disabled={closePeriod.isPending && closingId === item.id}
                          title="Fechar período (bloquear edições)"
                        >
                          {closePeriod.isPending && closingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                          Fechar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Página {currentPage + 1} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
      </QueryState>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareX className="size-4 text-destructive" />
              Rejeitar períodos
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O colaborador poderá corrigir e reenviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              label="Motivo"
              placeholder="Ex: descrição de horas insuficiente"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectComment.trim() || rejectPeriods.isPending}>
              {rejectPeriods.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Clock className="mr-1.5 size-4" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
