import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Users2, Plus, Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useDepartments, useAllTeams, useCreateTeam, useDeleteTeam } from '@/core/api/hooks'
import { canManageOrganization, canManageDepartment } from '@/core/auth/permissions'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { Select } from '@/shared/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { Modal } from '@/shared/components/ui/Modal'
import { formatDate } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import type { UUID } from '@/core/api/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function AdminTeamsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role) ?? 'employee'
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: departments } = useDepartments(orgId as UUID)
  const deptIds = useMemo(() => (departments ?? []).map((d) => d.id as UUID), [departments])
  const teamQueries = useAllTeams(deptIds)
  const teams = useMemo(() => teamQueries.flatMap((q) => q.data ?? []), [teamQueries])
  const isLoading = departments === undefined || (deptIds.length > 0 && teamQueries.some((q) => q.isPending))
  const error = teamQueries.find((q) => q.error)?.error ?? null
  const createTeam = useCreateTeam()
  const deleteTeam = useDeleteTeam()

  const [activeDeptId, setActiveDeptId] = useState<string>('all')
  const [newName, setNewName] = useState('')
  const [newDeptId, setNewDeptId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const canCreate = canManageOrganization(role) || canManageDepartment(role)

  const filteredTeams = useMemo(() => {
    if (!teams) return []
    if (activeDeptId === 'all') return teams
    return teams.filter((t) => t.departmentId === activeDeptId)
  }, [teams, activeDeptId])

  const deptTeams = useMemo(() => {
    if (!teams || !departments) return {}
    const map: Record<string, number> = {}
    departments.forEach((d) => {
      map[d.id] = teams.filter((t) => t.departmentId === d.id).length
    })
    return map
  }, [teams, departments])

  const handleCreate = async () => {
    if (!newName.trim() || !newDeptId) return
    try {
      await createTeam.mutateAsync({ deptId: newDeptId as UUID, data: { name: newName.trim() } })
      toast.success('Team created')
      setNewName('')
      setNewDeptId('')
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create team')
    }
  }

  const handleDeleteDept = async () => {
    if (!deleteTarget) return
    try {
      const team = teams.find((t) => t.id === deleteTarget)
      if (!team) return
      await deleteTeam.mutateAsync({ deptId: team.departmentId, teamId: deleteTarget as UUID })
      toast.success('Team deleted')
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete team')
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Equipes" description="Gerenciar equipes" />
        <EmptyState icon={Users2} title="Falha ao carregar equipes" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Equipes" description="Gerenciar equipes entre departamentos">
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Nova Equipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Equipe</DialogTitle>
                <DialogDescription>Adicione uma nova equipe a um departamento.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <Select
                  label="Departamento"
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  placeholder="Selecione o departamento"
                  options={departments?.map((d) => ({ value: d.id, label: d.name })) ?? []}
                />
                <Input
                  placeholder="Nome da equipe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || !newDeptId || createTeam.isPending}>
                  {createTeam.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <Tabs defaultValue="all" value={activeDeptId} onValueChange={(v) => setActiveDeptId(v)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({teams?.length ?? 0})</TabsTrigger>
          {departments?.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>
              {d.name} ({deptTeams[d.id] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredTeams.length === 0 ? (
        <EmptyState icon={Users2} title="Nenhuma equipe neste departamento" description="Crie sua primeira equipe para começar." />
      ) : (
        <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" variants={containerVariants}>
          {filteredTeams.map((team) => (
            <motion.div key={team.id} variants={itemVariants} layout>
              <div className="group relative rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Users2 className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {departments?.find((d) => d.id === team.departmentId)?.name ?? 'Desconhecido'} &middot; Criada em {formatDate(team.createdAt)}
                      </p>
                    </div>
                  </div>
                  {canCreate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={() => setDeleteTarget(team.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h3 className="mb-2 font-semibold">Remover equipe?</h3>
        <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDeleteDept}>Remover</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
