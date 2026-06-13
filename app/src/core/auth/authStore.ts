import { create } from 'zustand'
import type { AuthState, UserInfo, OrgInfo } from './authTypes'

export interface AuthStore extends AuthState {
  login: (token: string, user: UserInfo, organizations: OrgInfo[]) => void
  logout: () => void
  setActiveOrg: (org: OrgInfo) => void
  setDemoMode: () => void
  restore: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  organizations: [],
  activeOrg: null,
  isAuthenticated: false,
  isLoading: true,
  isDemo: false,

  login: (token, user, organizations) => {
    const activeOrg = organizations[0] || null
    localStorage.setItem('tasky_token', token)
    localStorage.setItem('tasky_user', JSON.stringify(user))
    localStorage.setItem('tasky_orgs', JSON.stringify(organizations))
    localStorage.setItem('tasky_active_org', JSON.stringify(activeOrg))
    set({ token, user, organizations, activeOrg, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('tasky_token')
    localStorage.removeItem('tasky_user')
    localStorage.removeItem('tasky_orgs')
    localStorage.removeItem('tasky_active_org')
    set({
      token: null,
      user: null,
      organizations: [],
      activeOrg: null,
      isAuthenticated: false,
      isLoading: false,
      isDemo: false,
    })
  },

  setActiveOrg: (org) => {
    localStorage.setItem('tasky_active_org', JSON.stringify(org))
    set({ activeOrg: org })
  },

  setDemoMode: () => {
    set({ isAuthenticated: true, isLoading: false, isDemo: true })
  },

  restore: () => {
    try {
      const token = localStorage.getItem('tasky_token')
      const user = JSON.parse(localStorage.getItem('tasky_user') || 'null')
      const orgs = JSON.parse(localStorage.getItem('tasky_orgs') || '[]')
      const activeOrg = JSON.parse(localStorage.getItem('tasky_active_org') || 'null')
      if (token && user) {
        set({ token, user, organizations: orgs, activeOrg, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))
