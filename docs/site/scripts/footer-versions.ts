// The footer's versions: each released part of TaskY (app, api), then the
// docs site's own, each linked to the repository tree it was built from —
// `app@v1.2.0 · api@v1.2.0 · docs@v1.0.0` on the release tags
// (`app-1.2.0`, `api-1.2.0`), `app@v1.2.0+abc1234` linked to the commit
// otherwise, plain text without git. Pure: git facts in, entries out.

export interface Part {
  name: string
  /** The part's manifest version (app/package.json, api/build.gradle). */
  version: string
  /** The tag that releases this version, e.g. `app-1.2.0`. */
  tag: string
}

export interface FooterVersion {
  name: string
  version: string
  label: string
  href: string | null
}

// `name@vX.Y.Z`; the "v" is display-only, tags stay `app-1.2.0`.
export function label(name: string, version: string): string {
  return /^\d/.test(version) ? `${name}@v${version}` : `${name}@${version}`
}

export function footerVersions(opts: {
  repoUrl: string
  parts: Part[]
  docsVersion: string
  docsPath: string
  /** Tags on HEAD (`git tag --points-at HEAD`) and HEAD's sha; empty without git. */
  git: { tagsAtHead: string[]; sha: string }
}): FooterVersion[] {
  const { tagsAtHead, sha } = opts.git
  const short = sha.slice(0, 7)
  const entry = (name: string, version: string, ref: string | null, path = ''): FooterVersion => ({
    name,
    version,
    label: label(name, version),
    href: ref ? `${opts.repoUrl}/tree/${ref}${path}` : null,
  })
  const released = opts.parts.filter((p) => tagsAtHead.includes(p.tag))
  const parts = opts.parts.map((p) => {
    if (tagsAtHead.includes(p.tag)) return entry(p.name, p.version, p.tag)
    return sha ? entry(p.name, `${p.version}+${short}`, sha) : entry(p.name, p.version, null)
  })
  // The docs link to the same tree: a release tag on HEAD, else the commit.
  const docsRef = released[0]?.tag ?? (sha || null)
  const docsVersion = released.length || !sha ? opts.docsVersion : `${opts.docsVersion}+${short}`
  return [...parts, entry('docs', docsVersion, docsRef, `/${opts.docsPath}`)]
}
