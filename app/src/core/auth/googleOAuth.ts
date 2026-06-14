import { getConfig } from '@/core/config/runtimeConfig'
import { apiClient } from '@/core/api/apiClient'
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

export async function exchangeGoogleToken(idToken: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/google', { idToken })
}

export function getGoogleClientId(): string {
  return getConfig().googleClientId
}
