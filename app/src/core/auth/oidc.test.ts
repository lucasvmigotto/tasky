import { describe, expect, it } from 'vitest'
import { buildAuthorizeUrl, MOCK_GOOGLE_TENANT, MOCK_MICROSOFT_TENANT } from './oidc'

describe('buildAuthorizeUrl', () => {
  it('builds an implicit-flow authorize URL with nonce', () => {
    const url = new URL(
      buildAuthorizeUrl({
        baseUrl: 'http://localhost:48080/tasky-google-mock/authorize',
        clientId: 'tasky-dev',
        redirectUri: 'http://localhost:5173/',
      }),
    )
    expect(url.searchParams.get('client_id')).toBe('tasky-dev')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/')
    expect(url.searchParams.get('response_type')).toBe('id_token')
    expect(url.searchParams.get('response_mode')).toBe('fragment')
    expect(url.searchParams.get('scope')).toContain('openid')
    expect(url.searchParams.get('nonce')).toBeTruthy()
  })

  it('builds the Microsoft v2 authorize URL', () => {
    const url = new URL(
      buildAuthorizeUrl({
        baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        clientId: 'ms-client',
        redirectUri: 'http://localhost:5173/',
      }),
    )
    expect(url.hostname).toBe('login.microsoftonline.com')
    expect(url.searchParams.get('response_type')).toBe('id_token')
  })

  it('exposes both mock tenants', () => {
    expect(MOCK_GOOGLE_TENANT).toBe('tasky-google-mock')
    expect(MOCK_MICROSOFT_TENANT).toBe('tasky-microsoft-mock')
  })
})
