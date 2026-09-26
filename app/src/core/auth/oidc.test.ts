import { describe, expect, it } from 'vitest'
import { buildAuthorizeUrl, MOCK_GOOGLE_TENANT, MOCK_MICROSOFT_TENANT } from './oidc'

describe('buildAuthorizeUrl', () => {
  it('builds a code-flow authorize URL with PKCE and state by default', async () => {
    const url = new URL(
      await buildAuthorizeUrl({
        baseUrl: 'http://localhost:48080/tasky-google-mock/authorize',
        clientId: 'tasky-dev',
        redirectUri: 'http://localhost:5173/',
      }),
    )
    expect(url.searchParams.get('client_id')).toBe('tasky-dev')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('response_mode')).toBe('query')
    expect(url.searchParams.get('scope')).toContain('openid')
    // S256 challenge is SHA-256 (32 bytes → 43 base64url chars), not the raw verifier.
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBeTruthy()
  })

  it('builds an implicit-flow authorize URL with nonce when opted out', async () => {
    const url = new URL(
      await buildAuthorizeUrl({
        baseUrl: 'http://localhost:48080/tasky-google-mock/authorize',
        clientId: 'tasky-dev',
        redirectUri: 'http://localhost:5173/',
        useCodeFlow: false,
      }),
    )
    expect(url.searchParams.get('response_type')).toBe('id_token')
    expect(url.searchParams.get('response_mode')).toBe('fragment')
    expect(url.searchParams.get('nonce')).toBeTruthy()
  })

  it('builds the Microsoft v2 authorize URL with code flow', async () => {
    const url = new URL(
      await buildAuthorizeUrl({
        baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        clientId: 'ms-client',
        redirectUri: 'http://localhost:5173/',
      }),
    )
    expect(url.hostname).toBe('login.microsoftonline.com')
    expect(url.searchParams.get('response_type')).toBe('code')
  })

  it('exposes both mock tenants', () => {
    expect(MOCK_GOOGLE_TENANT).toBe('tasky-google-mock')
    expect(MOCK_MICROSOFT_TENANT).toBe('tasky-microsoft-mock')
  })
})
