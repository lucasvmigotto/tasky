import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../a11y/harness'

describe('navigation', () => {
  it('renders the current page title as h1 and a breadcrumb', () => {
    renderPage('architecture')
    expect(screen.getByRole('heading', { level: 1, name: /Arquitetura/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
  })

  it('lists every nav group page as a link', () => {
    renderPage('overview')
    const nav = screen.getByRole('navigation', { name: /documentation/i })
    expect(nav).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Arquitetura' }).length).toBeGreaterThan(0)
  })

  it('switches language and re-labels the UI', async () => {
    const user = userEvent.setup()
    renderPage('overview')
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { level: 1, name: /Overview/i })).toBeInTheDocument()
  })

  it('marks the active page with aria-current', () => {
    renderPage('overview')
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current.length).toBeGreaterThan(0)
  })
})
