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

export function buildAuthorizeUrl(options: AuthorizeOptions): string {
  const useCodeFlow = options.useCodeFlow ?? true
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: useCodeFlow ? 'code' : 'id_token',
    response_mode: useCodeFlow ? 'query' : 'fragment',
    scope: options.scope || 'openid email profile',
  })

  if (useCodeFlow) {
    const { codeVerifier, codeChallenge } = generatePkcePair()
    window.sessionStorage.setItem(PKCE_STORAGE_KEY, codeVerifier)
    params.set('code_challenge', codeChallenge)
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

const PKCE_STORAGE_KEY = 'tasky-pkce'

function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const codeChallenge = btoa(codeVerifier).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return { codeVerifier, codeChallenge }
}

const PROVIDER_STORAGE_KEY = 'tasky-oidc-provider'
export const MOCK_GOOGLE_TENANT = 'tasky-google-mock'
export const MOCK_MICROSOFT_TENANT = 'tasky-microsoft-mock'

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

function getStoredCodeVerifier(): string | null {
  return window.sessionStorage.getItem(PKCE_STORAGE_KEY)
}

function clearPkce(): void {
  window.sessionStorage.removeItem(PKCE_STORAGE_KEY)
  window.sessionStorage.removeItem('tasky-oidc-state')
}

export function startMicrosoftLogin(): void {
  const clientId = getConfig().microsoftClientId
  if (!clientId) {
    console.error('MICROSOFT_CLIENT_ID is not configured')
    return
  }
  window.sessionStorage.setItem('tasky-oidc-provider', 'MICROSOFT')
  window.location.href = buildAuthorizeUrl({
    baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId,
    redirectUri: `${window.location.origin}/`,
    useCodeFlow: true,
  })
}

export function startMockLogin(provider: 'MOCK_GOOGLE' | 'MOCK_MICROSOFT'): void {
  const config = getConfig()
  if (config.mockOAuth2Enabled !== 'true') {
    console.error('Mock OIDC is disabled')
    return
  }
  const tenant = provider === 'MOCK_GOOGLE' ? MOCK_GOOGLE_TENANT : MOCK_MICROSOFT_TENANT
  window.sessionStorage.setItem('tasky-oidc-provider', provider)
  window.location.href = buildAuthorizeUrl({
    baseUrl: `${config.mockOAuth2Url.replace(/\/$/, '')}/${provider === 'MOCK_GOOGLE' ? 'tasky-google-mock' : 'tasky-microsoft-mock'}/authorize`,
    clientId: 'tasky-dev',
    redirectUri: `${window.location.origin}/`,
    useCodeFlow: true,
  })
}

export async function exchangeOidcCode(provider: OidcProvider, code: string, codeVerifier: string): Promise<any> {
  return apiClient.post<any>('/auth/oidc/code', { provider, code, code_verifier: codeVerifier })
}

export async function handleOidcCallback(): Promise<boolean> {
  const provider = pendingProvider()
  if (!provider) {
    return false
  }
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  
  if (error) {
    console.error('OIDC error:', error, params.get('error_description'))
    clearPkce()
    window.sessionStorage.removeItem('tasky-oidc-provider')
    return false
  }
  
  if (!code || !state) {
    clearPkce()
    return false
  }
  
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
  
  window.sessionStorage.removeItem('tasky-oidc-state')
  clearPkce()
  
  await useAuthStore.getState().loginWithOidcCode(provider, code, codeVerifier)
  return true
}

function pendingProvider(): OidcProvider | null {
  const value = window.sessionStorage.getItem('tasky-oidc-provider')
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

export async function exchangeOidcToken(provider: OidcProvider, idToken: string): Promise<any> {
  return apiClient.post<any>('/auth/oidc', { provider, idToken })
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

export function startMicrosoftLogin(): void {
  const clientId = getConfig().microsoftClientId
  if (!clientId) {
    console.error('MICROSOFT_CLIENT_ID is not configured')
    return
  }
  window.sessionStorage.setItem('tasky-oidc-provider', 'MICROSOFT')
  window.location.href = buildAuthorizeUrl({
    baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId,
    redirectUri: `${window.location.origin}/`,
    useCodeFlow: true,
  })
}

export function startMockLogin(provider: 'MOCK_GOOGLE' | 'MOCK_MICROSOFT'): void {
  const config = getConfig()
  if (config.mockOAuth2Enabled !== 'true') {
    console.error('Mock OIDC is disabled')
    return
  }
  const tenant = provider === 'MOCK_GOOGLE' ? 'tasky-google-mock' : 'tasky-microsoft-mock'
  window.sessionStorage.setItem('tasky-oidc-provider', provider)
  window.location.href = buildAuthorizeUrl({
    baseUrl: `${config.mockOAuth2Url.replace(/\/$/, '')}/${provider === 'MOCK_GOOGLE' ? 'tasky-google-mock' : 'tasky-microsoft-mock'}/authorize`,
    clientId: 'tasky-dev',
    redirectUri: `${window.location.origin}/`,
    useCodeFlow: true,
  })
}

export async function exchangeOidcToken(provider: OidcProvider, idToken: string): Promise<any> {
  return apiClient.post<any>('/auth/oidc', { provider, idToken })
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