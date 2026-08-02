import { useState } from 'react'
import { motion } from 'motion/react'
import { Landmark, Plus, Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/core/api/hooks'
import { canManageDepartment } from '@/core/auth/permissions'
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
import { Modal } from '@/shared/components/ui/Modal'
import { formatDate } from '@/shared/lib/formatters'
import { toast } from 'sonner'
import type { UUID, ClientResponse } from '@/core/api/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function AdminClientsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: clients, isLoading, error } = useClients(orgId as UUID)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const canCreate = role ? canManageDepartment(role) : false

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<ClientResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientResponse | null>(null)

  const handleSave = async () => {
    if (!newName.trim() || !orgId) return
    try {
      if (editing) {
        await updateClient.mutateAsync({ orgId: orgId as UUID, clientId: editing.id, data: { name: newName.trim() } })
        toast.success('Unidade solicitante atualizada')
      } else {
        await createClient.mutateAsync({ orgId: orgId as UUID, data: { name: newName.trim() } })
        toast.success('Unidade solicitante criada')
      }
      setNewName('')
      setEditing(null)
      setIsDialogOpen(false)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar unidade solicitante')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !orgId) return
    try {
      await deleteClient.mutateAsync({ orgId: orgId as UUID, clientId: deleteTarget.id })
      toast.success('Unidade solicitante removida')
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover unidade solicitante')
    }
  }

  const openCreate = () => {
    setEditing(null)
    setNewName('')
    setIsDialogOpen(true)
  }

  const openEdit = (client: ClientResponse) => {
    setEditing(client)
    setNewName(client.name)
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Unidades Solicitantes" description="Gerenciar setores que demandam projetos" />
        <EmptyState icon={Landmark} title="Falha ao carregar unidades solicitantes" description={error.message} />
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-6" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader title="Unidades Solicitantes" description="Setores, diretorias ou órgãos internos que demandam projetos">
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 size-4" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Unidade Solicitante' : 'Nova Unidade Solicitante'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Atualize o nome da unidade.' : 'Cadastre o setor, diretoria ou órgão que solicita demandas.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Ex: Gabinete, Comunicação, Secretaria de Educação"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!newName.trim() || createClient.isPending || updateClient.isPending}>
                  {createClient.isPending || updateClient.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {clients?.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma unidade solicitante ainda"
          description="Use unidades solicitantes para registrar quem pediu cada projeto ou demanda interna."
          actionLabel="Nova Unidade"
          onAction={openCreate}
        />
      ) : (
        <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" variants={containerVariants}>
          {clients?.map((client) => (
            <motion.div key={client.id} variants={itemVariants} layout>
              <div className="group relative rounded-lg border bg-card p-5 transition-all hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Landmark className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Criado em {formatDate(client.createdAt)}</p>
                    </div>
                  </div>
                  {canCreate && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="size-8" onClick={() => openEdit(client)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteTarget(client)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h3 className="mb-2 font-semibold">Remover unidade solicitante?</h3>
        <p className="text-sm text-muted-foreground">
          Os projetos vinculados a esta unidade ficarão sem unidade solicitante. Esta ação não pode ser desfeita.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteClient.isPending}>
            {deleteClient.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Remover
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}
