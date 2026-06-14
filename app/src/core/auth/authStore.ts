import { create } from 'zustand'
import { setAccessToken, getAccessToken, apiClient } from '@/core/api/apiClient'
import { setRefreshHandler } from '@/core/api/interceptors'
import { getConfig } from '@/core/config/runtimeConfig'
import type { AuthState, UserInfo, OrgInfo } from './authTypes'
import type { Role } from './permissions'
import type { AuthResponse } from '@/core/api/types'

type AuthActions = {
  loginWithGoogle: (idToken: string) => Promise<void>
  loginWithDemo: () => Promise<void>
  refreshToken: () => Promise<string | null>
  setActiveOrg: (org: OrgInfo) => void
  logout: () => void
  restore: () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => {
  const handleAuthResponse = (data: AuthResponse) => {
    setAccessToken(data.token)
    const orgs: OrgInfo[] = data.organizations.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      role: o.role as Role,
    }))
    set({
      token: data.token,
      user: data.user as UserInfo,
      organizations: orgs,
      activeOrg: orgs.length > 0 ? orgs[0] : null,
      isAuthenticated: true,
      isLoading: false,
      isDemo: false,
    })
  }

  setRefreshHandler(async () => {
    try {
      const data = await apiClient.post<{ token: string }>('/auth/refresh')
      setAccessToken(data.token)
      set({ token: data.token })
      return data.token
    } catch {
      get().logout()
      return null
    }
  })

  return {
    token: null,
    user: null,
    organizations: [],
    activeOrg: null,
    isAuthenticated: false,
    isLoading: true,
    isDemo: false,

    loginWithGoogle: async (idToken: string) => {
      set({ isLoading: true })
      try {
        const data = await apiClient.post<AuthResponse>('/auth/google', { idToken })
        handleAuthResponse(data)
      } catch (err) {
        set({ isLoading: false })
        throw err
      }
    },

    loginWithDemo: async () => {
      set({ isLoading: true })
      const { getDemoAuth } = await import('./demoAuth')
      const demo = getDemoAuth()
      set({
        token: demo.token,
        user: demo.user,
        organizations: demo.organizations,
        activeOrg: demo.organizations[0] || null,
        isAuthenticated: true,
        isLoading: false,
        isDemo: true,
      })
    },

    refreshToken: async () => {
      try {
        const data = await apiClient.post<{ token: string }>('/auth/refresh')
        setAccessToken(data.token)
        set({ token: data.token, isAuthenticated: true, isLoading: false })
        return data.token
      } catch {
        set({ isLoading: false })
        get().logout()
        return null
      }
    },

    setActiveOrg: (org: OrgInfo) => {
      set({ activeOrg: org })
    },

    logout: () => {
      setAccessToken(null)
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

    restore: async () => {
      const config = getConfig()
      if (config.demoMode === 'true') {
        await get().loginWithDemo()
        return
      }
      const token = getAccessToken()
      if (token) {
        try {
          await get().refreshToken()
        } catch {
          set({ isLoading: false })
        }
      } else {
        set({ isLoading: false })
      }
    },
  }
})
