/**
 * Emits LLM-readable output from the SAME typed content the pages render:
 *   <out>/docs/<locale>/<page>.md   one Markdown file per page
 *   <out>/llms.txt                  index per llmstxt.org
 *   <out>/llms-full.txt             every page concatenated
 * Called by `vite.config.ts` during the build, into the served directory
 * (checked-in `public/` assets + this generated Markdown).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { en } from '../src/i18n/locales/en'
import { ptBR } from '../src/i18n/locales/pt-BR'
import {
  type Block,
  type DocsContent,
  LOCALES,
  type Locale,
  type Maturity,
  NAV_GROUPS,
  PAGE_IDS,
} from '../src/i18n/types'

const here = dirname(fileURLToPath(import.meta.url))
const BUNDLES: Record<Locale, DocsContent> = { 'pt-BR': ptBR, en }

const MARKER: Record<Locale, (m: Maturity) => string> = {
  'pt-BR': (m) => {
    const labels: Record<Maturity, string> = {
      implemented: '**Implementado.**',
      partial: '**Parcialmente implementado — partes ainda faltam.**',
      planned: '**Planejado — ainda não implementado.**',
      unavailable: '**Indisponível.**',
      upstream: '**Limitação externa.**',
      na: '**Não aplicável.**',
    }
    return labels[m]
  },
  en: (m) => {
    const labels: Record<Maturity, string> = {
      implemented: '**Implemented.**',
      partial: '**Partially implemented — parts still missing.**',
      planned: '**Planned — not implemented yet.**',
      unavailable: '**Unavailable.**',
      upstream: '**Upstream limitation.**',
      na: '**Not applicable.**',
    }
    return labels[m]
  },
}

function blockToMarkdown(block: Block): string {
  switch (block.kind) {
    case 'p':
      return block.text
    case 'ul':
      return block.items.map((i) => `- ${i}`).join('\n')
    case 'ol':
      return block.items.map((i, n) => `${n + 1}. ${i}`).join('\n')
    case 'code':
      return `${block.caption ? `_${block.caption}_\n\n` : ''}\`\`\`${block.lang}\n${block.code}\n\`\`\``
    case 'table': {
      const head = `| ${block.headers.join(' | ')} |`
      const sep = `| ${block.headers.map(() => '---').join(' | ')} |`
      const rows = block.rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
      return `${block.caption ? `_${block.caption}_\n\n` : ''}${head}\n${sep}\n${rows}`
    }
    case 'callout':
      return `> **${block.title ?? 'Note'}** — ${block.text}`
    case 'shot':
      return `![${block.alt}](${block.src.replace(/^\.\//, '')})\n\n_${block.caption}_`
  }
}

export function pageToMarkdown(
  content: DocsContent,
  locale: Locale,
  pageId: (typeof PAGE_IDS)[number],
  forFull = false,
): string {
  const page = content.pages[pageId]
  const lines: string[] = []
  const isEnglish = locale === 'en'
  lines.push(`# ${page.title}`)
  if (page.maturity && page.maturity !== 'implemented') lines.push('', MARKER[locale](page.maturity))
  lines.push('', page.summary, '')
  for (const s of page.sections) {
    lines.push(`## ${s.heading}`)
    if (s.maturity && s.maturity !== 'implemented') lines.push('', MARKER[locale](s.maturity))
    lines.push('')
    for (const b of s.blocks) lines.push(blockToMarkdown(b), '')
  }
  if (!forFull) {
    lines.push('---', '')
    lines.push(
      isEnglish ? '[Back to the documentation index](../../llms.txt)' : '[Voltar ao índice](../../llms.txt)',
    )
  }
  return lines.join('\n')
}

export function write(locale: Locale, outRoot: string) {
  const content = BUNDLES[locale]
  const outDir = resolve(outRoot, 'docs', locale)
  mkdirSync(outDir, { recursive: true })
  for (const id of PAGE_IDS) {
    writeFileSync(resolve(outDir, `${id}.md`), pageToMarkdown(content, locale, id))
  }
}

export function writeIndex(outRoot: string) {
  const content = BUNDLES['pt-BR']
  const lines: string[] = []
  lines.push(`# ${content.ui.siteName}`)
  lines.push('')
  lines.push(`> ${content.ui.siteTagline}`)
  lines.push('')
  for (const group of NAV_GROUPS) {
    lines.push(`## ${content.ui.groupLabels[group.key]}`)
    for (const id of group.pages) {
      const page = content.pages[id]
      lines.push(`- [${page.title}](docs/pt-BR/${id}.md): ${page.summary}`)
    }
    lines.push('')
  }
  lines.push('## English')
  const enContent = BUNDLES.en
  for (const id of PAGE_IDS) {
    const page = enContent.pages[id]
    lines.push(`- [${page.title}](docs/en/${id}.md): ${page.summary}`)
  }
  lines.push('')
  lines.push('## Optional')
  lines.push('- [llms-full.txt](llms-full.txt): every page concatenated for one-shot ingestion')
  lines.push('')
  writeFileSync(resolve(outRoot, 'llms.txt'), lines.join('\n'))
}

export function writeFull(outRoot: string) {
  const parts: string[] = []
  for (const locale of LOCALES) {
    parts.push(`# TaskY documentation (${locale})`, '')
    for (const id of PAGE_IDS) parts.push(pageToMarkdown(BUNDLES[locale], locale, id, true))
    parts.push('')
  }
  writeFileSync(resolve(outRoot, 'llms-full.txt'), parts.join('\n'))
}

export function generateLlmsOutput(outRoot: string): void {
  mkdirSync(outRoot, { recursive: true })
  for (const locale of LOCALES) write(locale, outRoot)
  writeIndex(outRoot)
  writeFull(outRoot)
}

// Standalone use (tests, debugging): writes into public/ like before.
export function generateAll(outRoot = resolve(here, '..', 'public')): string {
  rmSync(resolve(outRoot, 'docs'), { recursive: true, force: true })
  generateLlmsOutput(outRoot)
  return `${LOCALES.length} locales × ${PAGE_IDS.length} pages + llms.txt + llms-full.txt`
}

// Only run when executed directly (bun run scripts/build-llms.ts), never on import.
if (import.meta.main) {
  console.log(`llm output: ${generateAll()}`)
}
