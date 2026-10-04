import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../src/i18n'

/**
 * Regression guard: the docs-hub prefix lives in the URL pathname (Vite
 * `base`), while the hash carries the route. A hash router must not also set
 * `basename` to the prefix, or it looks for the prefix inside the hash,
 * matches nothing and renders a blank page — the bug that shipped to CI.
 */
describe('hash router under the docs-hub prefix', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, 'pt-BR')
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderAt(href: string) {
    // jsdom reports the URL at import time; resetModules above makes the
    // module-level router pick up whatever location this sets.
    window.history.replaceState(null, '', href)
    return import('../../src/app/router').then(({ App }) => render(<App />))
  }

  it('renders the default-locale overview from the prefixed root', async () => {
    await renderAt('/tasky/')
    // The root route redirects to the default locale's overview.
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(window.location.hash).toMatch(/^#\/(pt-BR|en)\/overview/)
  })

  it('renders a deep link under the prefix', async () => {
    await renderAt('/tasky/#/pt-BR/architecture')
    expect(await screen.findByRole('heading', { level: 1, name: /Arquitetura/i })).toBeInTheDocument()
  })
})
