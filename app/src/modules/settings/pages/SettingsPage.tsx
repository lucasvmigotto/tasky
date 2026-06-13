import { useState } from 'react'
import { motion } from 'motion/react'
import { User, Save, Camera } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Avatar, AvatarFallback } from '@/shared/components/ui/Avatar'
import { demoUserProfile } from '@/modules/settings/data/settings.mock'

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
  const [profile, setProfile] = useState(demoUserProfile)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
                  <AvatarFallback className="!bg-gradient-to-br from-pink-500 to-rose-500 text-xl font-bold text-white">
                    {getInitials(profile.displayName)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105">
                  <Camera className="size-3.5" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{profile.displayName}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground/60">@{profile.username}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Nome de exibição" value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} />
            <Input label="Email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <Input label="Nome de usuário" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="shadow-lg shadow-primary/20">
            <Save className="mr-1.5 size-4" />
            {saved ? '✓ Salvo!' : 'Salvar alterações'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
