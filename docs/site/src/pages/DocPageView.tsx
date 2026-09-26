import { Link, Navigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../components/Layout'
import { BlockView, StatusBadge } from '../components/ui'
import { useI18n } from '../i18n'
import { PAGE_IDS } from '../i18n/types'

export function DocPageView() {
  const { content, locale } = useI18n()
  const params = useParams<{ pageId?: string }>()
  const pageId = PAGE_IDS.find((id) => id === params.pageId)

  if (!pageId) {
    return <Navigate to={`/${locale}/overview`} replace />
  }

  const page = content.pages[pageId]

  return (
    <article className="max-w-3xl">
      <Breadcrumbs pageId={pageId} />
      <header className="mt-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{page.title}</h1>
          {page.maturity && <StatusBadge maturity={page.maturity} />}
        </div>
        <p className="mt-2 text-muted-foreground">{page.summary}</p>
      </header>

      <nav aria-label={content.ui.onThisPage} className="mb-8 rounded-lg border border-border p-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {content.ui.onThisPage}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {page.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted-foreground hover:text-foreground">
                {s.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {page.sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{s.heading}</h2>
              {s.maturity && <StatusBadge maturity={s.maturity} />}
            </div>
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              {s.blocks.map((b, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static content
                <BlockView key={i} block={b} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-border pt-4 text-sm">
        <Link to={`/${locale}/overview`} className="text-muted-foreground hover:text-foreground">
          ← {content.ui.breadcrumbHome}
        </Link>
      </footer>
    </article>
  )
}

export function NotFound() {
  const { content, locale } = useI18n()
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">{content.ui.notFoundTitle}</h1>
      <p className="mt-2 text-muted-foreground">{content.ui.notFoundText}</p>
      <Link
        to={`/${locale}/overview`}
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {content.ui.backHome}
      </Link>
    </div>
  )
}

export function HomeRedirect() {
  const { locale } = useI18n()
  return <Navigate to={`/${locale}/overview`} replace />
}
