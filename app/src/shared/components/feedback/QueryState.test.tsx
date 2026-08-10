import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryState } from './QueryState'

describe('QueryState', () => {
  it('renders loading with accessible text', () => {
    render(<QueryState isLoading>conteudo</QueryState>)
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('renders children when ready', () => {
    render(<QueryState>conteudo</QueryState>)
    expect(screen.getByText('conteudo')).toBeInTheDocument()
  })
})
