import { create } from 'zustand'
import { setAccessToken, apiClient, ApiError, setRefreshExecutor } from '@/core/api/apiClient'
import { setLogoutHandler } from '@/core/api/interceptors'
import { getConfig } from '@/core/config/runtimeConfig'
import type { AuthState, UserInfo, OrgInfo } from './authTypes'
import type { Role } from './permissions'
import type { AuthRefreshResponse, AuthResponse } from '@/core/api/types'
import { queryClient } from '@/app/providers/QueryProvider'
import { useTimeTrackerStore } from '@/core/tracker/timeTrackerStore'

function resetTenantState() {
  void queryClient.cancelQueries()
  queryClient.clear()
  useTimeTrackerStore.getState().reset()
}

type AuthActions = {
  loginWithGoogle: (idToken: string) => Promise<void>
  loginWithDemo: () => Promise<void>
  refreshToken: () => Promise<string | null>
  setActiveOrg: (org: OrgInfo) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
}

let coordinatedRefresh: Promise<AuthRefreshResponse> | null = null
let restorePromise: Promise<void> | null = null
let authVersion = 0

function withRefreshLock(operation: () => Promise<AuthRefreshResponse>) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request('tasky-refresh', operation) : operation()
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => {
  const mapOrganizations = (organizations: AuthResponse['organizations']): OrgInfo[] => organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: org.role as Role,
    timezone: org.timezone ?? 'UTC',
    workWeekStartsOn: org.workWeekStartsOn ?? 1,
  }))

  const handleAuthResponse = (data: AuthResponse) => {
    authVersion += 1
    setAccessToken(data.token)
    const orgs = mapOrganizations(data.organizations)
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

  const handleRefreshResponse = (data: AuthRefreshResponse) => {
    authVersion += 1
    setAccessToken(data.token)
    const organizations = mapOrganizations(data.organizations)
    const activeOrg = organizations.find((org) => org.id === data.activeOrganizationId) ?? null
    set({
      token: data.token,
      user: data.user as UserInfo,
      organizations,
      activeOrg,
      isAuthenticated: true,
      isLoading: false,
      isDemo: false,
    })
  }

  const clearLocalAuth = (expectedVersion?: number) => {
    if (expectedVersion !== undefined && expectedVersion !== authVersion) return
    authVersion += 1
    setAccessToken(null)
    resetTenantState()
    set({
      token: null,
      user: null,
      organizations: [],
      activeOrg: null,
      isAuthenticated: false,
      isLoading: false,
      isDemo: false,
    })
  }

  const requestRefresh = () => {
    coordinatedRefresh ??= withRefreshLock(async () => {
      const response = await apiClient.raw('/auth/refresh', { method: 'POST' })
      if (!response.ok) throw new ApiError(response.status, 'Sessão expirada')
      return response.json() as Promise<AuthRefreshResponse>
    }).finally(() => {
      coordinatedRefresh = null
    })
    return coordinatedRefresh
  }

  setRefreshExecutor(async () => {
    const versionAtStart = authVersion
    try {
      const body = await requestRefresh()
      if (versionAtStart !== authVersion) return get().token
      handleRefreshResponse(body)
      return body.token
    } catch {
      clearLocalAuth(versionAtStart)
      return null
    }
  })

  setLogoutHandler(() => {
    clearLocalAuth()
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
      authVersion += 1
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
      authVersion += 1
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
      const versionAtStart = authVersion
      try {
        const body = await requestRefresh()
        if (versionAtStart !== authVersion) return get().token
        handleRefreshResponse(body)
        return body.token
      } catch {
        clearLocalAuth(versionAtStart)
        return null
      }
    },

    setActiveOrg: async (org: OrgInfo) => {
      authVersion += 1
      try {
        resetTenantState()
        const data = await apiClient.post<{ token: string; org: OrgInfo }>('/auth/switch-org', { orgId: org.id })
        setAccessToken(data.token)
        set({ token: data.token, activeOrg: data.org })
      } catch {
        throw new Error('Falha ao trocar de organização')
      }
    },

    logout: async () => {
      authVersion += 1
      try {
        await apiClient.raw('/auth/logout', { method: 'POST' })
      } finally {
        clearLocalAuth()
      }
    },

    restore: async () => {
      if (restorePromise) return restorePromise
      restorePromise = (async () => {
        const config = getConfig()
        if (config.demoMode === 'true') {
          await get().loginWithDemo()
          return
        }
        const { handleGoogleCallback } = await import('./googleOAuth')
        if (await handleGoogleCallback()) {
          return
        }
        try {
          await get().refreshToken()
        } catch {
          clearLocalAuth()
        }
      })().finally(() => {
        restorePromise = null
      })
      return restorePromise
    },
  }
})
