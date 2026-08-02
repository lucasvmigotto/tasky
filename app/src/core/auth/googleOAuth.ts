import { getConfig } from '@/core/config/runtimeConfig'
import { apiClient } from '@/core/api/apiClient'
import { useAuthStore } from '@/core/auth/authStore'
import type { AuthResponse } from '@/core/api/types'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

interface GoogleOAuthOptions {
  clientId: string
  redirectUri: string
  scope?: string
}

export function buildGoogleAuthUrl(options: GoogleOAuthOptions): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'id_token',
    scope: options.scope || 'openid email profile',
    nonce: crypto.randomUUID(),
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export function startGoogleLogin(): void {
  const clientId = getConfig().googleClientId
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not configured')
    return
  }
  window.location.href = buildGoogleAuthUrl({
    clientId,
    redirectUri: `${window.location.origin}/`,
  })
}

export async function handleGoogleCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const idToken = params.get('id_token')
  if (!idToken) {
    return false
  }

  window.history.replaceState({}, document.title, window.location.pathname)
  await useAuthStore.getState().loginWithGoogle(idToken)
  return true
}

export async function exchangeGoogleToken(idToken: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/google', { idToken })
}

export function getGoogleClientId(): string {
  return getConfig().googleClientId
}
