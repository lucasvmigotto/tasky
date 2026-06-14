import type { UserInfo, OrgInfo } from '@/core/auth/authTypes'
import type { Role } from '@/core/auth/permissions'

export interface DemoAuthData {
  token: string
  user: UserInfo
  organizations: OrgInfo[]
  activeOrg: OrgInfo
}

export function getDemoAuth(): DemoAuthData {
  const user: UserInfo = {
    id: 'demo-user-001',
    email: 'ana.silva@tasky.io',
    username: 'ana.silva',
    displayName: 'Ana Silva',
    avatarUrl: null,
  }

  const organizations: OrgInfo[] = [
    {
      id: 'org-001',
      name: 'TaskY Labs',
      slug: 'tasky-labs',
      role: 'admin' as Role,
    },
    {
      id: 'org-002',
      name: 'Agilize',
      slug: 'agilize',
      role: 'employee' as Role,
    },
  ]

  return {
    token: 'demo-jwt-eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vLXVzZXItMDAxIn0.signature',
    user,
    organizations,
    activeOrg: organizations[0],
  }
}
