import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { useAuthStore } from './authStore'
import { server } from '@/test/server'

describe('authStore session restoration', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.location.hash = ''
    useAuthStore.setState({
      token: null,
      user: null,
      organizations: [],
      activeOrg: null,
      isAuthenticated: false,
      isLoading: true,
      isDemo: false,
    })
  })

  it('hydrates the user, organizations and active organization after refresh', async () => {
    await useAuthStore.getState().restore()

    const state = useAuthStore.getState()
    expect(state.user).toMatchObject({ id: 'user-1', email: 'admin@test.com' })
    expect(state.organizations).toEqual([
      expect.objectContaining({ id: 'org-1', role: 'admin' }),
    ])
    expect(state.activeOrg).toMatchObject({ id: 'org-1', role: 'admin' })
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('clears an invalid session locally without sending a racing logout request', async () => {
    let logoutCalls = 0
    server.use(
      http.post('/api/v1/auth/refresh', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/v1/auth/logout', () => {
        logoutCalls++
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await useAuthStore.getState().restore()

    expect(logoutCalls).toBe(0)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
