import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('branding', () => {
  it('index.html declares OG and Twitter image metadata placeholders', () => {
    const html = readFileSync(resolve(siteRoot, 'index.html'), 'utf8')
    expect(html).toContain('og:image')
    expect(html).toContain('twitter:card')
    expect(html).toContain('%OG_IMAGE%')
    expect(html).toContain('%SITE_NAME%')
  })

  it('og image exists (og-image.png)', () => {
    expect(existsSync(resolve(siteRoot, 'public', 'og-image.png'))).toBe(true)
  })
})
