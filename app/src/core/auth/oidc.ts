import { getConfig } from '@/core/config/runtimeConfig'
import { apiClient } from '@/core/api/apiClient'
import { useAuthStore } from '@/core/auth/authStore'
import type { AuthResponse, OidcProvider } from '@/core/api/types'

const PROVIDER_STORAGE_KEY = 'tasky-oidc-provider'
const PKCE_STORAGE_KEY = 'tasky-pkce'
export const MOCK_GOOGLE_TENANT = 'tasky-google-mock'
export const MOCK_MICROSOFT_TENANT = 'tasky-microsoft-mock'

interface AuthorizeOptions {
  baseUrl: string
  clientId: string
  redirectUri: string
  scope?: string
  useCodeFlow?: boolean
}

export async function buildAuthorizeUrl(options: AuthorizeOptions): Promise<string> {
  const useCodeFlow = options.useCodeFlow ?? true
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: useCodeFlow ? 'code' : 'id_token',
    response_mode: useCodeFlow ? 'query' : 'fragment',
    scope: options.scope || 'openid email profile',
  })

  if (useCodeFlow) {
    const codeVerifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    window.sessionStorage.setItem(PKCE_STORAGE_KEY, codeVerifier)
    params.set('code_challenge', await pkceChallenge(codeVerifier))
    params.set('code_challenge_method', 'S256')
    const state = crypto.randomUUID()
    params.set('state', state)
    window.sessionStorage.setItem('tasky-oidc-state', state)
  } else {
    const nonce = crypto.randomUUID()
    params.set('nonce', nonce)
  }

  return `${options.baseUrl}?${params.toString()}`
}

function redirectRoot(): string {
  return `${window.location.origin}/`
}

async function pkceChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  const bytes = new Uint8Array(digest)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
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

function getStoredCodeVerifier(): string | null {
  return window.sessionStorage.getItem(PKCE_STORAGE_KEY)
}

function clearPkce(): void {
  window.sessionStorage.removeItem(PKCE_STORAGE_KEY)
  window.sessionStorage.removeItem('tasky-oidc-state')
}

export async function startMicrosoftLogin(): Promise<void> {
  const clientId = getConfig().microsoftClientId
  if (!clientId) {
    console.error('MICROSOFT_CLIENT_ID is not configured')
    return
  }
  rememberProvider('MICROSOFT')
  window.location.href = await buildAuthorizeUrl({
    baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId,
    redirectUri: redirectRoot(),
    useCodeFlow: true,
  })
}

export async function startMockLogin(provider: 'MOCK_GOOGLE' | 'MOCK_MICROSOFT'): Promise<void> {
  const config = getConfig()
  if (config.mockOAuth2Enabled !== 'true') {
    console.error('Mock OIDC is disabled')
    return
  }
  const tenant = provider === 'MOCK_GOOGLE' ? MOCK_GOOGLE_TENANT : MOCK_MICROSOFT_TENANT
  rememberProvider(provider)
  window.location.href = await buildAuthorizeUrl({
    baseUrl: `${config.mockOAuth2Url.replace(/\/$/, '')}/${tenant}/authorize`,
    clientId: 'tasky-dev',
    redirectUri: redirectRoot(),
    useCodeFlow: true,
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

  // Code-flow path: parse `?code=&state=` from the URL query.
  const search = new URLSearchParams(window.location.search)
  const code = search.get('code')
  const state = search.get('state')
  const error = search.get('error')

  if (error) {
    console.error('OIDC error:', error, search.get('error_description'))
    clearPkce()
    window.sessionStorage.removeItem(PROVIDER_STORAGE_KEY)
    return false
  }

  if (code && state) {
    const storedState = window.sessionStorage.getItem('tasky-oidc-state')
    if (storedState !== state) {
      console.error('OIDC state mismatch')
      clearPkce()
      return false
    }
    const codeVerifier = getStoredCodeVerifier()
    if (!codeVerifier) {
      console.error('Missing PKCE code verifier')
      clearPkce()
      return false
    }
    clearPkce()
    window.history.replaceState({}, document.title, window.location.pathname)
    await useAuthStore.getState().loginWithOidcCode(provider, code, codeVerifier)
    return true
  }

  // Legacy implicit-flow path: parse `#id_token=` from the URL hash.
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
