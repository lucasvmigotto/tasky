import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import LoginPage from './LoginPage'

// A2: both SSO providers are always offered. The Microsoft handler no-ops
// (with a console error) when its client id is unset, so the button must not
// be hidden just because the environment lacks one — that made the login
// screen look Google-only in documentation and in a fresh deployment.
describe('LoginPage', () => {
  beforeEach(() => {
    ;(window as { __TASKY_CONFIG__?: Record<string, string> }).__TASKY_CONFIG__ = {
      GOOGLE_CLIENT_ID: 'google-client-id',
      MICROSOFT_CLIENT_ID: '',
      MOCK_OAUTH2_ENABLED: 'false',
    }
  })

  it('renders both Google and Microsoft sign-in buttons even without a Microsoft client id', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Entrar com Microsoft/i })).toBeInTheDocument()
  })

  it('hides the mock panel when mock OIDC is disabled', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /Mock Google/i })).not.toBeInTheDocument()
  })
})
