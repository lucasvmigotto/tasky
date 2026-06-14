import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Tags, Plus, Trash2, Lock, Shield } from 'lucide-react'
import { canManageLabels } from '@/core/auth/permissions'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { Modal } from '@/shared/components/ui/Modal'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { formatDate } from '@/shared/lib/formatters'
import { demoLabels } from '@/modules/admin/data/labels.mock'
import { demoMembers } from '@/modules/admin/data/members.mock'

const labelColors = [
  'bg-rose-500',
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-lime-500',
]

function getLabelColor(index: number) {
  return labelColors[index % labelColors.length]
}

function getMemberDisplayName(userId: string | null) {
  if (!userId) return '—'
  const member = demoMembers.find((m) => m.userId === userId)
  return member?.username ?? userId
}

export default function AdminLabelsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const canManage = role ? canManageLabels(role) : false

  const [tab, setTab] = useState('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<(typeof demoLabels)[number] | null>(null)

  const filtered = useMemo(() => {
    if (tab === 'system') return demoLabels.filter((l) => l.isSystem)
    if (tab === 'custom') return demoLabels.filter((l) => !l.isSystem)
    return demoLabels
  }, [tab])

  function handleCreate() {
    if (!slug.trim() || !displayName.trim()) return
    setSlug('')
    setDisplayName('')
    setCreateOpen(false)
  }

  function handleDelete() {
    setDeleteOpen(false)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Labels" description="Gerenciar labels da organização">
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="size-4" />
                Criar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Label</DialogTitle>
                <DialogDescription>
                  Adicione uma nova label para categorizar atividades.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  label="Slug"
                  placeholder="Ex: bug-fix"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  helperText="Identificador único usado no sistema"
                />
                <Input
                  label="Nome de exibição"
                  placeholder="Ex: Correção de Bug"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!slug.trim() || !displayName.trim()}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="custom">Personalizadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((label, idx) => (
          <motion.div
            key={label.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-4 shrink-0 rounded-full ${getLabelColor(idx)}`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{label.displayName}</span>
                        {label.isSystem && (
                          <Badge variant="info" className="text-[10px] px-1.5 py-0">
                            <Shield className="mr-0.5 size-2.5" />
                            Sistema
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-1 text-[11px] font-mono text-muted-foreground">
                        {label.slug}
                      </Badge>
                    </div>
                  </div>
                  {!label.isSystem && canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setDeleteTarget(label)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                  {label.isSystem && (
                    <div className="flex size-8 items-center justify-center text-muted-foreground/40">
                      <Lock className="size-4" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    Criado por{' '}
                    <span className="font-medium text-foreground">
                      {getMemberDisplayName(label.createdBy)}
                    </span>
                  </span>
                  <span>{formatDate(label.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tags className="mb-3 size-10 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground">Nenhuma label encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'custom'
              ? 'Nenhuma label personalizada criada ainda.'
              : tab === 'system'
                ? 'Nenhuma label de sistema disponível.'
                : 'Nenhuma label disponível.'}
          </p>
        </div>
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover Label"
        description={`Tem certeza que deseja remover a label "${deleteTarget?.displayName ?? ''}"? Esta ação não pode ser desfeita.`}
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
