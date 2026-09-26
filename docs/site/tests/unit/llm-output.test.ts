import { describe, expect, it } from 'vitest'
import { pageToMarkdown } from '../../scripts/build-llms'
import { en } from '../../src/i18n/locales/en'
import { ptBR } from '../../src/i18n/locales/pt-BR'
import { type Maturity, PAGE_IDS } from '../../src/i18n/types'

describe('LLM markdown generation', () => {
  it('marks planned content inline in Portuguese', () => {
    const md = pageToMarkdown(ptBR, 'pt-BR', 'roadmap')
    expect(md).toContain('**Planejado — ainda não implementado.**')
  })

  it('marks planned content inline in English', () => {
    const md = pageToMarkdown(en, 'en', 'roadmap')
    expect(md).toContain('**Planned — not implemented yet.**')
  })

  it('renders tables as markdown tables and code with a language tag', () => {
    expect(pageToMarkdown(ptBR, 'pt-BR', 'overview')).toContain('| ')
    expect(pageToMarkdown(ptBR, 'pt-BR', 'getting-started')).toMatch(/```/)
  })

  for (const id of PAGE_IDS) {
    it(`${id} has a heading and non-empty body`, () => {
      const md = pageToMarkdown(ptBR, 'pt-BR', id)
      expect(md.startsWith('# ')).toBe(true)
      expect(md.length).toBeGreaterThan(80)
    })
  }

  it('every non-implemented maturity carries an inline label on every page', () => {
    const labelled: Maturity[] = ['planned', 'partial', 'unavailable', 'upstream']
    for (const id of PAGE_IDS) {
      const page = ptBR.pages[id]
      const marks = [page.maturity, ...page.sections.map((s) => s.maturity)].filter(Boolean) as Maturity[]
      const expected = marks.some((m) => labelled.includes(m))
      if (!expected) continue
      const md = pageToMarkdown(ptBR, 'pt-BR', id)
      expect(md, `${id} should carry a maturity label`).toMatch(
        /\*\*(Planejado|Parcialmente|Indisponível|Limitação externa)/,
      )
    }
  })
})
