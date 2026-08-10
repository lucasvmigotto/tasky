import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Loader2, Save, Settings2, ShieldAlert, Trash2, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/core/auth/authStore'
import {
  useGlobalSettings,
  useUpdateGlobalSetting,
  useOrganizationSettings,
  useUpdateOrganizationSetting,
  useOrganizations,
} from '@/core/api/hooks'
import type { SettingsResponse, SettingValue, UUID } from '@/core/api/types'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Select } from '@/shared/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Badge } from '@/shared/components/ui/Badge'
import { toast } from 'sonner'

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: SettingValue
  value: string
  onChange: (value: string) => void
}) {
  if (setting.valueType === 'SECRET') {
    return (
      <Input
        type="password"
        placeholder={setting.isSet ? '•••••••• (mantém o valor atual)' : 'Definir valor'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
      />
    )
  }
  if (setting.valueType === 'BOOLEAN') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        aria-label={setting.label}
      >
        <option value="true">Ativado</option>
        <option value="false">Desativado</option>
      </select>
    )
  }
  if (setting.valueType === 'JSON') {
    return (
      <Textarea
        className="font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    )
  }
  if (setting.valueType === 'NUMBER') {
    return (
      <Input
        type="number"
        value={value}
        min={setting.min ?? undefined}
        max={setting.max ?? undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  if (setting.options && setting.options.length > 0) {
    return (
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={setting.options.map((option) => ({ value: option, label: option }))}
      />
    )
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} />
}

function SettingRow({
  setting,
  isSaving,
  onSave,
  onClear,
}: {
  setting: SettingValue
  isSaving: boolean
  onSave: (value: string) => void
  onClear?: () => void
}) {
  const [draft, setDraft] = useState(setting.isSet && setting.value != null ? setting.value : '')
  const initial = useMemo(() => setting.value ?? '', [setting])

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{setting.label}</h3>
            {setting.isOverride && <Badge variant="secondary" className="text-[10px]">override</Badge>}
            {setting.valueType === 'SECRET' && setting.isSet && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <KeyRound className="size-3" /> definido
              </span>
            )}
          </div>
          {setting.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
          )}
          <div className="mt-2 max-w-xl">
            <SettingField setting={setting} value={draft} onChange={setDraft} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => onSave(draft)}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
          {onClear && (setting.isOverride || (setting.valueType === 'SECRET' && setting.isSet)) && (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={isSaving} onClick={onClear}>
              <Trash2 className="size-4" />
              {setting.isOverride ? 'Remover override' : 'Limpar'}
            </Button>
          )}
        </div>
      </div>
      {setting.isOverride && (
        <p className="mt-2 text-xs text-muted-foreground">
          Este valor é um override da organização. Ao limpar, volta a valer o valor global.
        </p>
      )}
    </div>
  )
}

export default function AdminSettingsPage() {
  const role = useAuthStore((s) => s.activeOrg?.role)
  const orgId = useAuthStore((s) => s.activeOrg?.id)
  const { data: global, isLoading: loadingGlobal } = useGlobalSettings()
  const updateGlobal = useUpdateGlobalSetting()

  const { data: organizations } = useOrganizations()
  const [selectedOrg, setSelectedOrg] = useState('')
  const orgOptions = organizations ?? []
  const viewOrgId = (role === 'super_admin' ? selectedOrg || orgOptions[0]?.id || '' : orgId) as UUID
  const { data: orgSettings, isLoading: loadingOrg } = useOrganizationSettings(viewOrgId || null)
  const updateOrgSetting = useUpdateOrganizationSetting(viewOrgId)

  const [savingKey, setSavingKey] = useState<string | null>(null)

  async function saveGlobal(setting: SettingValue, value: string) {
    setSavingKey(setting.key)
    try {
      const data = setting.valueType === 'SECRET' ? { value: value.trim() || undefined } : { value: value.trim() }
      if (setting.valueType === 'SECRET' && !value.trim()) {
        toast.info('Informe o novo valor do segredo ou use "Limpar"')
        return
      }
      await updateGlobal.mutateAsync({ key: setting.key, data })
      toast.success('Configuração global salva')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar configuração')
    } finally {
      setSavingKey(null)
    }
  }

  async function clearGlobal(setting: SettingValue) {
    setSavingKey(setting.key)
    try {
      await updateGlobal.mutateAsync({ key: setting.key, data: { clear: true } })
      toast.success('Valor limpo (voltou ao padrão)')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao limpar configuração')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveOrgSetting(setting: SettingValue, value: string, targetOrgId: UUID) {
    setSavingKey(`${targetOrgId}:${setting.key}`)
    try {
      await updateOrgSetting.mutateAsync({ key: setting.key, data: { value: value.trim() } })
      toast.success('Configuração da organização salva')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar configuração')
    } finally {
      setSavingKey(null)
    }
  }

  async function clearOrgSetting(setting: SettingValue, targetOrgId: UUID) {
    setSavingKey(`${targetOrgId}:${setting.key}`)
    try {
      await updateOrgSetting.mutateAsync({ key: setting.key, data: { clear: true } })
      toast.success('Override removido')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover override')
    } finally {
      setSavingKey(null)
    }
  }

  function renderGroups(response: SettingsResponse | undefined, loading: boolean) {
    if (loading) {
      return (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      )
    }
    if (!response || response.groups.length === 0) {
      return (
        <Card>
          <CardContent className="p-8">
            <EmptyState icon={Settings2} title="Sem configurações" description="Nenhuma configuração disponível para este escopo." />
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="flex flex-col gap-6">
        {response.groups.map((group) => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {group.settings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  isSaving={savingKey === setting.key}
                  onSave={(value) => saveGlobal(setting, value)}
                  onClear={() => clearGlobal(setting)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  function renderOrgGroups(response: SettingsResponse | undefined, loading: boolean, targetOrgId: UUID) {
    if (loading) {
      return <Skeleton className="h-96 w-full" />
    }
    if (!response || response.groups.length === 0) {
      return (
        <Card>
          <CardContent className="p-8">
            <EmptyState icon={Settings2} title="Sem configurações" description="Nenhuma configuração disponível." />
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="flex flex-col gap-6">
        {response.groups.map((group) => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {group.settings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  isSaving={savingKey === `${targetOrgId}:${setting.key}`}
                  onSave={(value) => saveOrgSetting(setting, value, targetOrgId)}
                  onClear={() => clearOrgSetting(setting, targetOrgId)}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (role !== 'super_admin' && role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={ShieldAlert}
            title="Acesso restrito"
            description="Apenas administradores podem acessar as configurações do sistema."
          />
        </CardContent>
      </Card>
    )
  }

  const showOrgTab = role === 'super_admin'

  return (
    <motion.div className="flex flex-col gap-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Configurações do Sistema"
        description="Parâmetros globais e por organização. Os valores ficam no banco de dados e valem imediatamente."
      />

      {showOrgTab ? (
        <Tabs defaultValue="global">
          <TabsList>
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="org">Por organização</TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="flex flex-col gap-6">
            {renderGroups(global, loadingGlobal)}
          </TabsContent>
          <TabsContent value="org" className="flex flex-col gap-6">
            <Card>
              <CardContent className="p-4">
                <Select
                  label="Organização"
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  placeholder="Selecione a organização"
                  options={orgOptions.map((o) => ({ value: o.id, label: o.name }))}
                />
              </CardContent>
            </Card>
            {viewOrgId && renderOrgGroups(orgSettings, loadingOrg, viewOrgId)}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col gap-6">
          {renderOrgGroups(orgSettings, loadingOrg, (orgId as UUID) ?? '')}
        </div>
      )}
    </motion.div>
  )
}
