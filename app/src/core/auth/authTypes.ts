import type { Role } from '@/core/auth/permissions'

export interface AuthState {
  token: string | null
  user: UserInfo | null
  organizations: OrgInfo[]
  activeOrg: OrgInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  isDemo: boolean
}

export interface UserInfo {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export interface OrgInfo {
  id: string
  name: string
  slug: string
  role: Role
}
