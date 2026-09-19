import { getConfig } from '@/core/config/runtimeConfig'
import { apiClient } from '@/core/api/apiClient'
import { useAuthStore } from '@/core/auth/authStore'
import type { AuthResponse, OidcProvider } from '@/core/api/types'

const PROVIDER_STORAGE_KEY = 'tasky-oidc-provider'
export const MOCK_GOOGLE_TENANT = 'tasky-google-mock'
export const MOCK_MICROSOFT_TENANT = 'tasky-microsoft-mock'

interface AuthorizeOptions {
  baseUrl: string
  clientId: string
  redirectUri: string
  scope?: string
}

export function buildAuthorizeUrl(options: AuthorizeOptions): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'id_token',
    response_mode: 'fragment',
    scope: options.scope || 'openid email profile',
    nonce: crypto.randomUUID(),
  })
  return `${options.baseUrl}?${params.toString()}`
}

function redirectRoot(): string {
  return `${window.location.origin}/`
}

function rememberProvider(provider: OidcProvider): void {
  window.sessionStorage.setItem(PROVIDER_STORAGE_KEY, provider)
}

function pendingProvider(): OidcProvider | null {
  const value = window.sessionStorage.getItem(PROVIDER_STORAGE_KEY)
  return value === 'GOOGLE' || value === 'MICROSOFT' || value === 'MOCK_GOOGLE' || value === 'MOCK_MICROSOFT'
    ? value
    : null
}

export function startMicrosoftLogin(): void {
  const clientId = getConfig().microsoftClientId
  if (!clientId) {
    console.error('MICROSOFT_CLIENT_ID is not configured')
    return
  }
  rememberProvider('MICROSOFT')
  window.location.href = buildAuthorizeUrl({
    baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId,
    redirectUri: redirectRoot(),
  })
}

export function startMockLogin(provider: 'MOCK_GOOGLE' | 'MOCK_MICROSOFT'): void {
  const config = getConfig()
  if (config.mockOAuth2Enabled !== 'true') {
    console.error('Mock OIDC is disabled')
    return
  }
  const tenant = provider === 'MOCK_GOOGLE' ? MOCK_GOOGLE_TENANT : MOCK_MICROSOFT_TENANT
  rememberProvider(provider)
  window.location.href = buildAuthorizeUrl({
    baseUrl: `${config.mockOAuth2Url.replace(/\/$/, '')}/${tenant}/authorize`,
    clientId: 'tasky-dev',
    redirectUri: redirectRoot(),
  })
}

export async function exchangeOidcToken(provider: OidcProvider, idToken: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/oidc', { provider, idToken })
}

export async function handleOidcCallback(): Promise<boolean> {
  const provider = pendingProvider()
  if (!provider) {
    return false
  }
  const params = new URLSearchParams(window.location.hash.slice(1))
  const idToken = params.get('id_token')
  if (!idToken) {
    return false
  }
  window.sessionStorage.removeItem(PROVIDER_STORAGE_KEY)
  window.history.replaceState({}, document.title, window.location.pathname)
  await useAuthStore.getState().loginWithOidc(provider, idToken)
  return true
}
