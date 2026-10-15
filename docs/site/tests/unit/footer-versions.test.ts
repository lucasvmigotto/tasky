import { describe, expect, it } from 'vitest'
import { footerVersions } from '../../scripts/footer-versions'

const base = {
  repoUrl: 'https://github.com/o/r',
  parts: [
    { name: 'app', version: '1.2.0', tag: 'app-1.2.0' },
    { name: 'api', version: '1.2.0', tag: 'api-1.2.0' },
  ],
  docsVersion: '1.0.0',
  docsPath: 'docs/site',
}
const sha = 'abc1234def5678'

describe('footerVersions', () => {
  it('links each released part to its own tag', () => {
    const v = footerVersions({ ...base, git: { tagsAtHead: ['app-1.2.0', 'api-1.2.0'], sha } })
    expect(v.map((x) => x.label)).toEqual(['app@v1.2.0', 'api@v1.2.0', 'docs@v1.0.0'])
    expect(v.map((x) => x.href)).toEqual([
      'https://github.com/o/r/tree/app-1.2.0',
      'https://github.com/o/r/tree/api-1.2.0',
      'https://github.com/o/r/tree/app-1.2.0/docs/site',
    ])
  })

  it('marks a part without its tag on HEAD with the commit', () => {
    const v = footerVersions({ ...base, git: { tagsAtHead: ['app-1.2.0'], sha } })
    expect(v.map((x) => x.label)).toEqual(['app@v1.2.0', 'api@v1.2.0+abc1234', 'docs@v1.0.0'])
    expect(v[1]?.href).toBe(`https://github.com/o/r/tree/${sha}`)
  })

  it('marks an untagged build, and has no link without git', () => {
    const untagged = footerVersions({ ...base, git: { tagsAtHead: [], sha } })
    expect(untagged.map((x) => x.label)).toEqual([
      'app@v1.2.0+abc1234',
      'api@v1.2.0+abc1234',
      'docs@v1.0.0+abc1234',
    ])
    const nogit = footerVersions({ ...base, git: { tagsAtHead: [], sha: '' } })
    expect(nogit.map((x) => x.label)).toEqual(['app@v1.2.0', 'api@v1.2.0', 'docs@v1.0.0'])
    expect(nogit.every((x) => x.href === null)).toBe(true)
  })
})
