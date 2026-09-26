import { existsSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { en } from '../../src/i18n/locales/en'
import { ptBR } from '../../src/i18n/locales/pt-BR'
import { PAGE_IDS } from '../../src/i18n/types'

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const screenshotsDir = resolve(siteRoot, 'public', 'screenshots')

function referencedShots() {
  const refs = new Set<string>()
  for (const bundle of [ptBR, en]) {
    for (const id of PAGE_IDS) {
      for (const section of bundle.pages[id].sections) {
        for (const block of section.blocks) {
          if (block.kind === 'shot') refs.add(block.src.replace('./screenshots/', ''))
        }
      }
    }
  }
  return refs
}

describe('screenshots', () => {
  it('every referenced screenshot exists on disk', () => {
    for (const src of referencedShots()) {
      expect(existsSync(resolve(screenshotsDir, src)), `missing ${src}`).toBe(true)
    }
  })

  it('every screenshot on disk is referenced by some page', () => {
    const onDisk = readdirSync(screenshotsDir).filter((f) => f.endsWith('.png'))
    const refs = referencedShots()
    for (const file of onDisk) {
      expect(refs.has(file), `unreferenced screenshot ${file}`).toBe(true)
    }
  })
})
