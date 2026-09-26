import { type ReactNode, useState } from 'react'
import { useI18n } from '../i18n'
import type { Block, Maturity } from '../i18n/types'

export function StatusBadge({ maturity }: { maturity: Maturity }) {
  const { content } = useI18n()
  const label = content.ui.maturityLabels[maturity]
  const tone: Record<Maturity, string> = {
    implemented: 'border-success/40 text-success',
    partial: 'border-warning/40 text-warning',
    planned: 'border-info/40 text-info',
    unavailable: 'border-destructive/40 text-destructive',
    upstream: 'border-destructive/40 text-destructive',
    na: 'border-border text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone[maturity]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function Section({
  id,
  heading,
  maturity,
  children,
}: { id: string; heading: string; maturity?: Maturity; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{heading}</h2>
        {maturity && <StatusBadge maturity={maturity} />}
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function Callout({
  tone,
  title,
  text,
}: { tone: 'info' | 'warning' | 'success'; title?: string; text: string }) {
  const tones = {
    info: 'border-info/40 bg-info/5',
    warning: 'border-warning/40 bg-warning/5',
    success: 'border-success/40 bg-success/5',
  }
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      {title && <p className="mb-1 font-medium text-foreground">{title}</p>}
      <p>{text}</p>
    </div>
  )
}

export function DocTable({
  headers,
  rows,
  caption,
}: { headers: string[]; rows: string[][]; caption?: string }) {
  return (
    <figure className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="mb-2 text-left text-xs text-muted-foreground">{caption}</caption>}
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-left font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are static content
            <tr key={i} className="border-b border-border/50 align-top">
              {row.map((cell, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are static content
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function CodeBlock({ lang, code, caption }: { lang: string; code: string; caption?: string }) {
  const { content } = useI18n()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked; the code is still selectable
    }
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{caption ?? lang}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          aria-label={copied ? `${content.ui.search}: ${lang}` : `Copiar ${caption ?? lang}`}
        >
          {copied ? '✓' : '⧉'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </figure>
  )
}

export function Screenshot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-card">
      <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full" />
      <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}

export function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return <p>{block.text}</p>
    case 'ul':
      return (
        <ul className="list-disc space-y-1.5 pl-5">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="list-decimal space-y-1.5 pl-5">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      )
    case 'code':
      return <CodeBlock lang={block.lang} code={block.code} caption={block.caption} />
    case 'table':
      return <DocTable headers={block.headers} rows={block.rows} caption={block.caption} />
    case 'callout':
      return <Callout tone={block.tone} title={block.title} text={block.text} />
    case 'shot':
      return <Screenshot src={block.src} alt={block.alt} caption={block.caption} />
  }
}
