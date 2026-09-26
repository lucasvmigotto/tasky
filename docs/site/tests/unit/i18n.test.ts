import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, detectLocale, readStoredLocale } from '../../src/i18n'
import { en } from '../../src/i18n/locales/en'
import { ptBR } from '../../src/i18n/locales/pt-BR'
import { NAV_GROUPS, PAGE_IDS } from '../../src/i18n/types'

describe('locale detection', () => {
  beforeEach(() => localStorage.clear())

  it('maps pt-* browser languages to pt-BR', () => {
    expect(detectLocale(['pt-BR'])).toBe('pt-BR')
    expect(detectLocale(['pt'])).toBe('pt-BR')
  })

  it('maps en-* to en', () => {
    expect(detectLocale(['en-US'])).toBe('en')
  })

  it('falls back to en for unknown languages', () => {
    expect(detectLocale(['de-DE', 'fr'])).toBe('en')
  })

  it('prefers the first supported language in order', () => {
    expect(detectLocale(['fr', 'pt-PT', 'en'])).toBe('pt-BR')
  })

  it('reads a stored locale', () => {
    localStorage.setItem(STORAGE_KEY, 'en')
    expect(readStoredLocale()).toBe('en')
    localStorage.setItem(STORAGE_KEY, 'xx')
    expect(readStoredLocale()).toBeNull()
  })
})

describe('content completeness', () => {
  it('both locales define every page and section id', () => {
    for (const id of PAGE_IDS) {
      const pt = ptBR.pages[id]
      const english = en.pages[id]
      expect(pt, `pt-BR missing ${id}`).toBeTruthy()
      expect(english, `en missing ${id}`).toBeTruthy()
      expect(pt.sections.map((s) => s.id)).toEqual(english.sections.map((s) => s.id))
      expect(pt.sections.length).toBeGreaterThan(0)
    }
  })

  it('every nav group page exists', () => {
    for (const group of NAV_GROUPS) {
      for (const id of group.pages) {
        expect(PAGE_IDS).toContain(id)
      }
    }
  })

  it('every section has at least one block', () => {
    for (const id of PAGE_IDS) {
      for (const s of ptBR.pages[id].sections) {
        expect(s.blocks.length, `${id}/${s.id} has no blocks`).toBeGreaterThan(0)
      }
    }
  })
})
