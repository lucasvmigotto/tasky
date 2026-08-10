import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { User, Save, Camera, Loader2, Bell } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar'
import { useAuthStore } from '@/core/auth/authStore'
import { useMemberships, useUpdateMembershipSettings, useNotificationPreferences, useUpdateNotificationPreferences } from '@/core/api/hooks'
import { toast } from 'sonner'
import type { UUID, NotificationPreferenceType } from '@/core/api/types'

const PREFERENCE_LABELS: Record<NotificationPreferenceType, { label: string; description: string }> = {
  ACTIVITY_DUE_SOON: { label: 'Prazo próximo', description: 'Lembre-me antes do vencimento de uma atividade.' },
  ACTIVITY_OVERDUE: { label: 'Atividade atrasada', description: 'Avisa quando uma atividade passar do prazo.' },
  OPEN_TIMER: { label: 'Timer aberto', description: 'Lembra de encerrar ou pausar um timer que ficou aberto.' },
  TIME_ENTRY_PENDING_APPROVAL: { label: 'Apontamentos pendentes', description: 'Informa gestores sobre apontamentos aguardando aprovação.' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const activeOrg = useAuthStore((s) => s.activeOrg)
  const orgId = activeOrg?.id ?? null

  const { data: memberships } = useMemberships(orgId as UUID)
  const updateSettings = useUpdateMembershipSettings()

  const membership = memberships?.find((m) => m.userId === user?.id)

  const [customUsername, setCustomUsername] = useState('')
  const [maxDailyWorkMinutes, setMaxDailyWorkMinutes] = useState(480)
  const [timezone, setTimezone] = useState(activeOrg?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const { data: preferences } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const [preferenceValues, setPreferenceValues] = useState<Record<NotificationPreferenceType, boolean>>({
    ACTIVITY_DUE_SOON: true,
    ACTIVITY_OVERDUE: true,
    OPEN_TIMER: true,
    TIME_ENTRY_PENDING_APPROVAL: true,
  })
  useEffect(() => {
    if (preferences?.preferences) {
      const next = { ...preferenceValues }
      for (const pref of preferences.preferences) {
        next[pref.type] = pref.enabled
      }
      setPreferenceValues(next)
    }
  }, [preferences])
  useEffect(() => {
    if (membership) {
      setCustomUsername(membership.customUsername ?? '')
      setMaxDailyWorkMinutes(membership.maxDailyWorkMinutes)
      setTimezone(membership.timezone ?? activeOrg?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
    } else {
      setCustomUsername('')
      setMaxDailyWorkMinutes(480)
      setTimezone(activeOrg?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
  }, [activeOrg?.id, activeOrg?.timezone, membership])

  async function handleSave() {
    if (!orgId || !membership) return
    try {
      await updateSettings.mutateAsync({
        orgId: orgId as UUID,
        membershipId: membership.id,
        data: {
          customUsername: customUsername.trim() || undefined,
          maxDailyWorkMinutes,
          timezone: timezone.trim() || undefined,
        },
      })
      toast.success('Configurações salvas')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar configurações')
    }
  }

  async function handleSavePreferences() {
    try {
      await updatePreferences.mutateAsync({
        preferences: (Object.keys(preferenceValues) as NotificationPreferenceType[]).map((type) => ({
          type,
          enabled: preferenceValues[type],
        })),
      })
      toast.success('Preferências de notificação salvas')
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar preferências')
    }
  }

  return (
    <motion.div
      className="mx-auto flex max-w-4xl flex-col gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader title="Configurações" description="Gerencie seu perfil" />

      <motion.div variants={itemVariants} className="space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/5 via-card to-card p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="size-20 ring-2 ring-primary/20 shadow-lg">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName ?? ''} />
                  ) : (
                    <AvatarFallback className="!bg-gradient-to-br from-pink-500 to-rose-500 text-xl font-bold text-white">
                      {getInitials(user?.displayName ?? user?.username ?? '')}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{user?.displayName ?? user?.username}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground/60">@{user?.username}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Nome de exibição" value={user?.displayName ?? ''} readOnly />
            <Input label="Email" type="email" value={user?.email ?? ''} readOnly />
            <Input
              label="Nome de usuário customizado"
              placeholder={user?.username ?? ''}
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
            />
            <Input
              label="Limite diário de trabalho (minutos)"
              type="number"
              min={1}
              max={1440}
              value={maxDailyWorkMinutes}
              onChange={(e) => setMaxDailyWorkMinutes(Number(e.target.value))}
            />
            <Input
              label="Timezone IANA"
              placeholder="America/Sao_Paulo"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Bell className="size-4 text-muted-foreground" />
              Notificações e lembretes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(PREFERENCE_LABELS) as NotificationPreferenceType[]).map((type) => (
              <div key={type} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{PREFERENCE_LABELS[type].label}</p>
                  <p className="text-xs text-muted-foreground">{PREFERENCE_LABELS[type].description}</p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={preferenceValues[type]}
                    onChange={(e) => setPreferenceValues((prev) => ({ ...prev, [type]: e.target.checked }))}
                    className="peer sr-only"
                    aria-label={PREFERENCE_LABELS[type].label}
                  />
                  <span className="h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring" />
                </label>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSavePreferences} disabled={updatePreferences.isPending}>
                {updatePreferences.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
                Salvar preferências
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="shadow-lg shadow-primary/20" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
            Salvar alterações
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
