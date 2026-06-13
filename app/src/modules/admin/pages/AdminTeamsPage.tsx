import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Users2, Plus, Trash2 } from 'lucide-react'
import { canManageOrganization } from '@/core/auth/permissions'
import { useAuthStore } from '@/core/auth/authStore'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
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
import { demoTeams } from '@/modules/admin/data/teams.mock'
import { demoDepartments } from '@/modules/admin/data/departments.mock'
import { demoMembers } from '@/modules/admin/data/members.mock'

const memberTeamMap: Record<string, string[]> = {
  'memb-001': ['team-001', 'team-002'],
  'memb-002': ['team-002', 'team-003'],
  'memb-003': ['team-004'],
  'memb-004': ['team-004', 'team-005'],
  'memb-005': ['team-001'],
  'memb-006': ['team-006'],
  'memb-007': ['team-006'],
  'memb-008': ['team-005'],
}

function getMemberCount(teamId: string) {
  return Object.values(memberTeamMap).filter((teams) => teams.includes(teamId)).length
}

export default function AdminTeamsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const isAdmin = role ? canManageOrganization(role) : false

  const [deptFilter, setDeptFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDept, setTeamDept] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<(typeof demoTeams)[number] | null>(null)

  const getDeptName = (id: string) => demoDepartments.find((d) => d.id === id)?.name ?? '-'

  const filteredTeams = useMemo(() => {
    if (deptFilter === 'all') return demoTeams
    return demoTeams.filter((t) => t.departmentId === deptFilter)
  }, [deptFilter])

  function handleCreate() {
    if (!teamName.trim() || !teamDept) return
    setTeamName('')
    setTeamDept('')
    setCreateOpen(false)
  }

  function handleDelete() {
    setDeleteOpen(false)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Times" description="Gerenciar times da organização">
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="size-4" />
                Criar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Time</DialogTitle>
                <DialogDescription>
                  Adicione um novo time a um departamento.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  label="Nome do time"
                  placeholder="Ex: Frontend"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
                <Select
                  label="Departamento"
                  options={demoDepartments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Selecione um departamento"
                  value={teamDept}
                  onChange={(e) => setTeamDept(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!teamName.trim() || !teamDept}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <Tabs value={deptFilter} onValueChange={setDeptFilter} defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          {demoDepartments.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>
              {d.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team, idx) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
          >
            <div className="group relative rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-border/80">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Users2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{team.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {getDeptName(team.departmentId)}
                    </Badge>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => {
                      setDeleteTarget(team)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{getMemberCount(team.id)}</span> membro(s)
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(team.createdAt)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users2 className="mb-3 size-10 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum time encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente ajustar o filtro de departamento.
          </p>
        </div>
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover Time"
        description={`Tem certeza que deseja remover o time "${deleteTarget?.name ?? ''}"? Esta ação não pode ser desfeita.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  )
}
