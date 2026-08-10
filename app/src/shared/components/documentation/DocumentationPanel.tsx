import { useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Download, Eye, FileText, Loader2, Paperclip, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddDocumentAttachment,
  useCreateDocument,
  useDeleteDocument,
  useDocumentAttachments,
  useDocumentVersions,
  useProjectDocuments,
  useRemoveDocumentAttachment,
  useRequestDocuments,
  useRestoreDocumentVersion,
  useUpdateDocument,
  uploadFile,
  exportDocumentHtml,
} from '@/core/api/hooks'
import type { DocumentResponse, UUID } from '@/core/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Badge } from '@/shared/components/ui/Badge'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { formatDateTime } from '@/shared/lib/formatters'

interface DocumentationPanelProps {
  projectId?: UUID
  requestId?: UUID
}

export function DocumentationPanel({ projectId, requestId }: DocumentationPanelProps) {
  const { data: projectDocs = [] } = useProjectDocuments(projectId ?? null)
  const { data: requestDocs = [] } = useRequestDocuments(requestId ?? null)
  const documents = projectId ? projectDocs : requestDocs

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [changelog, setChangelog] = useState('')
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)

  const createDocument = useCreateDocument()
  const updateDocument = useUpdateDocument()
  const deleteDocument = useDeleteDocument()
  const { data: versions = [] } = useDocumentVersions((selectedId as UUID) ?? null)
  const { data: attachments = [] } = useDocumentAttachments((selectedId as UUID) ?? null)
  const restoreVersion = useRestoreDocumentVersion()
  const addAttachment = useAddDocumentAttachment((selectedId as UUID) ?? '')
  const removeAttachment = useRemoveDocumentAttachment((selectedId as UUID) ?? '')

  const selected = documents.find((d) => d.id === selectedId) ?? null

  function openNew() {
    setSelectedId(null)
    setCreating(true)
    setTitle('')
    setContent('')
    setChangelog('')
    setPreview(false)
  }

  function openDocument(document: DocumentResponse) {
    setCreating(false)
    setSelectedId(document.id)
    setTitle(document.title)
    setContent(document.contentMd)
    setChangelog('')
    setPreview(false)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Informe um título')
      return
    }
    try {
      if (creating) {
        await createDocument.mutateAsync({
          projectId: projectId as UUID | undefined,
          requestId: requestId as UUID | undefined,
          title: title.trim(),
          contentMd: content,
        })
        toast.success('Documentação criada')
        setCreating(false)
        setSelectedId(null)
      } else if (selectedId) {
        await updateDocument.mutateAsync({
          documentId: selectedId as UUID,
          data: { title: title.trim(), contentMd: content, changelog: changelog.trim() || undefined },
        })
        toast.success('Documentação salva (versão registrada)')
        setChangelog('')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar documentação')
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Remover esta documentação?')) return
    try {
      await deleteDocument.mutateAsync(selectedId as UUID)
      setSelectedId(null)
      setCreating(false)
      toast.success('Documentação removida')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover documentação')
    }
  }

  async function handleRestore(versionId: string) {
    if (!selectedId) return
    try {
      const restored = await restoreVersion.mutateAsync({ documentId: selectedId as UUID, versionId: versionId as UUID })
      setContent(restored.contentMd)
      toast.success('Versão restaurada')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao restaurar versão')
    }
  }

  async function handleUpload(file: File) {
    if (!selectedId) return
    setUploading(true)
    try {
      const stored = await uploadFile(file)
      await addAttachment.mutateAsync(stored.id)
      toast.success('Arquivo anexado')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao anexar arquivo')
    } finally {
      setUploading(false)
    }
  }

  async function handleExport() {
    if (!selectedId) return
    try {
      await exportDocumentHtml(selectedId as UUID, selected?.title ?? 'documentacao')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao exportar')
    }
  }

  return (
    <section aria-label="Documentação" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-3 lg:col-span-1">
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="size-4 text-muted-foreground" />
            Documentos
          </h2>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="size-4" />
            Novo
          </Button>
        </div>
        {documents.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={BookOpen}
                title="Sem documentação"
                description="Documente o projeto e as features: especificações, decisões, manuais. Suporta texto formatado e anexos (PDF, imagens)."
                actionLabel="Criar documentação"
                onAction={openNew}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => openDocument(document)}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                  selectedId === document.id ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card hover:border-primary/30'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{document.title}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  v{document.version} · {document.attachmentCount} anexo(s) · {formatDateTime(document.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {!creating && !selected ? (
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={BookOpen}
                title="Selecione ou crie um documento"
                description="Escolha um documento à esquerda para editar, ou crie um novo para registrar a documentação."
              />
            </CardContent>
          </Card>
        ) : (
          <motion.div className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="size-4 text-muted-foreground" />
                  {creating ? 'Nova documentação' : `Editar · v${selected?.version}`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!creating && selected && (
                    <Button size="sm" variant="outline" onClick={handleExport}>
                      <Download className="size-4" />
                      Exportar (imprimir/PDF)
                    </Button>
                  )}
                  {!creating && selected && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Especificação da feature de relatórios" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Conteúdo (markdown)</span>
                  <Button size="sm" variant="ghost" onClick={() => setPreview((prev) => !prev)}>
                    <Eye className="size-4" />
                    {preview ? 'Editar' : 'Visualizar'}
                  </Button>
                </div>
                {preview ? (
                  <div className="min-h-64 whitespace-pre-wrap rounded-md border border-border/60 bg-muted/10 p-4 text-sm leading-6 text-foreground">
                    {content || 'Sem conteúdo.'}
                  </div>
                ) : (
                  <Textarea rows={12} placeholder={'# Título\n\nDescreva o contexto, requisitos e decisões da feature...'} value={content} onChange={(e) => setContent(e.target.value)} />
                )}
                {!creating && (
                  <Input label="Nota da versão (changelog)" placeholder="Ex: Incluído fluxo de aprovação" value={changelog} onChange={(e) => setChangelog(e.target.value)} />
                )}
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={!title.trim() || createDocument.isPending || updateDocument.isPending}>
                    {(createDocument.isPending || updateDocument.isPending) ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {!creating && selected && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="size-4 text-muted-foreground" />
                      Histórico de versões
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem versões registradas ainda.</p>
                    ) : (
                      versions.map((version) => (
                        <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">Versão {version.versionNo}</p>
                            {version.changelog && <p className="truncate text-xs text-muted-foreground">{version.changelog}</p>}
                            <p className="text-xs text-muted-foreground">{formatDateTime(version.createdAt)}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleRestore(version.id)}>
                            Restaurar
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Paperclip className="size-4 text-muted-foreground" />
                      Anexos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,application/pdf,.docx,text/markdown,text/plain"
                        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleUpload(file)
                          e.target.value = ''
                        }}
                      />
                      {uploading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    </div>
                    {attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum anexo (ex.: PDF do documento oficial).</p>
                    ) : (
                      attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                          <div className="min-w-0">
                            {attachment.url ? (
                              <a className="flex items-center gap-1 truncate text-sm font-medium text-primary hover:underline" href={attachment.url} target="_blank" rel="noopener noreferrer">
                                {attachment.fileName}
                              </a>
                            ) : (
                              <span className="truncate text-sm font-medium text-foreground">{attachment.fileName}</span>
                            )}
                            <p className="text-xs text-muted-foreground">{attachment.contentType} • {attachment.sizeBytes} bytes</p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeAttachment.mutateAsync(attachment.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        )}
      </div>
    </section>
  )
}
