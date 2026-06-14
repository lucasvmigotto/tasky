export interface UserProfile {
  displayName: string
  email: string
  username: string
  avatarUrl: string | null
  timezone: string
  locale: string
  maxDailyWorkMinutes: number
  weekStartDay: 0 | 1
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyReport: boolean
}

export const demoUserProfile: UserProfile = {
  displayName: 'Ana Silva',
  email: 'ana.silva@tasky.com',
  username: 'anasilva',
  avatarUrl: null,
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  maxDailyWorkMinutes: 480,
  weekStartDay: 1,
  emailNotifications: true,
  pushNotifications: true,
  weeklyReport: true,
}
