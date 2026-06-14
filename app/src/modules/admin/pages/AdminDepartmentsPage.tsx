import { useState } from 'react'
import { motion } from 'motion/react'
import { Building2, Plus, Trash2, FolderKanban, Users, Users2 } from 'lucide-react'
import { canManageOrganization } from '@/core/auth/permissions'
import { useAuthStore } from '@/core/auth/authStore'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { StatCard } from '@/shared/components/charts/StatCard'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/Dialog'
import { Modal } from '@/shared/components/ui/Modal'
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert'
import { formatDate } from '@/shared/lib/formatters'
import { demoDepartments } from '@/modules/admin/data/departments.mock'
import { demoTeams } from '@/modules/admin/data/teams.mock'
import { demoMembers } from '@/modules/admin/data/members.mock'
import { demoProjects } from '@/modules/admin/data/projects.mock'

const memberDepartmentMap: Record<string, string> = {
  'memb-001': 'dept-001',
  'memb-002': 'dept-001',
  'memb-003': 'dept-002',
  'memb-004': 'dept-002',
  'memb-005': 'dept-001',
  'memb-006': 'dept-003',
  'memb-007': 'dept-003',
  'memb-008': 'dept-002',
}

export default function AdminDepartmentsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const isAdmin = role ? canManageOrganization(role) : false

  const [createOpen, setCreateOpen] = useState(false)
  const [deptName, setDeptName] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<(typeof demoDepartments)[number] | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const deptStats = demoDepartments.map((dept) => {
    const teams = demoTeams.filter((t) => t.departmentId === dept.id)
    const projects = demoProjects.filter((p) => p.departmentId === dept.id)
    const members = demoMembers.filter((m) => memberDepartmentMap[m.id] === dept.id)
    return { ...dept, teamCount: teams.length, projectCount: projects.length, memberCount: members.length }
  })

  function handleCreate() {
    if (!deptName.trim()) return
    setDeptName('')
    setCreateOpen(false)
  }

  function handleDeleteClick(dept: (typeof demoDepartments)[number]) {
    const teams = demoTeams.filter((t) => t.departmentId === dept.id)
    const projects = demoProjects.filter((p) => p.departmentId === dept.id)
    if (teams.length > 0 || projects.length > 0) {
      setDeleteError(
        [
          teams.length > 0 && `${teams.length} time(s)`,
          projects.length > 0 && `${projects.length} projeto(s)`,
        ]
          .filter(Boolean)
          .join(' e ') + ' vinculados a este departamento. Remova-os primeiro.',
      )
    } else {
      setDeleteError('')
    }
    setDeleteTarget(dept)
    setDeleteOpen(true)
  }

  function handleDelete() {
    setDeleteOpen(false)
    setDeleteTarget(null)
    setDeleteError('')
  }

  const totalMembers = demoMembers.length
  const totalTeams = demoTeams.length

  return (
    <div className="space-y-6">
      <PageHeader title="Departamentos" description="Gerenciar departamentos da organização">
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
                <DialogTitle>Criar Departamento</DialogTitle>
                <DialogDescription>
                  Adicione um novo departamento à organização.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  label="Nome do departamento"
                  placeholder="Ex: Engenharia"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!deptName.trim()}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          value={demoDepartments.length}
          label="Departamentos"
          icon={Building2}
        />
        <StatCard
          value={totalTeams}
          label="Times"
          icon={Users2}
        />
        <StatCard
          value={totalMembers}
          label="Membros"
          icon={Users}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deptStats.map((dept, idx) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{dept.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDate(dept.createdAt)}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(dept)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{dept.teamCount}</p>
                    <p className="text-xs text-muted-foreground">Times</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{dept.projectCount}</p>
                    <p className="text-xs text-muted-foreground">Projetos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{dept.memberCount}</p>
                    <p className="text-xs text-muted-foreground">Membros</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover Departamento"
        description={
          deleteError
            ? undefined
            : `Tem certeza que deseja remover "${deleteTarget?.name ?? ''}"?`
        }
      >
        <div className="space-y-4">
          {deleteError ? (
            <Alert variant="destructive">
              <AlertTitle>Não é possível remover</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            {!deleteError && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Remover
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
