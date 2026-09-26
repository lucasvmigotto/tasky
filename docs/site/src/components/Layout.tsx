import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { NAV_GROUPS, PAGE_IDS, type PageId } from '../i18n/types'
import { useTheme } from '../lib/useTheme'

const VERSION = __APP_VERSION__

function SkipLink() {
  const { content } = useI18n()
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      {content.ui.skipToContent}
    </a>
  )
}

export function Breadcrumbs({ pageId }: { pageId: PageId }) {
  const { content } = useI18n()
  const page = content.pages[pageId]
  const group = NAV_GROUPS.find((g) => g.pages.includes(pageId))
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link to="/" className="hover:text-foreground">
        {content.ui.breadcrumbHome}
      </Link>
      {group && (
        <>
          <span aria-hidden="true">/</span>
          <span>{content.ui.groupLabels[group.key]}</span>
        </>
      )}
      <span aria-hidden="true">/</span>
      <span className="text-foreground">{page.title}</span>
    </nav>
  )
}

function LanguageSwitcher() {
  const { locale, content } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const options: { value: 'pt-BR' | 'en'; label: string }[] = [
    { value: 'pt-BR', label: 'PT' },
    { value: 'en', label: 'EN' },
  ]

  function switchTo(next: 'pt-BR' | 'en') {
    const parts = location.pathname.split('/').filter(Boolean)
    const page = parts[1] ?? 'overview'
    navigate(`/${next}/${page}`)
  }

  return (
    <fieldset className="flex items-center rounded-md border border-border text-xs">
      <legend className="sr-only">{content.ui.language}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => switchTo(o.value)}
          aria-pressed={locale === o.value}
          className={`px-2 py-1 ${
            locale === o.value
              ? 'bg-primary/15 font-semibold text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  )
}

function ThemeToggle() {
  const { toggle, theme } = useTheme()
  const { content } = useI18n()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${content.ui.theme}: ${theme === 'dark' ? content.ui.themeDark : content.ui.themeLight}`}
      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  )
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { content, locale } = useI18n()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setQuery('')
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = PAGE_IDS.map((id) => content.pages[id])
    if (!q) return all
    return all.filter((p) => {
      const haystack = [
        p.title,
        p.summary,
        ...p.sections.flatMap((s) => [s.heading, ...s.blocks.flatMap(flattenText)]),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query, content])

  return (
    <dialog
      ref={dialogRef}
      aria-label={content.ui.search}
      className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={content.ui.searchPlaceholder}
        aria-label={content.ui.search}
        className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
      />
      <ul className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">{content.ui.searchNoResults}</li>
        )}
        {results.map((p) => (
          <li key={p.id}>
            <Link
              to={`/${locale}/${p.id}`}
              onClick={onClose}
              className="block rounded-md px-3 py-2 hover:bg-muted"
            >
              <span className="text-sm font-medium text-foreground">{p.title}</span>
              <span className="block text-xs text-muted-foreground">{p.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </dialog>
  )
}

function flattenText(block: { kind: string } & Record<string, unknown>): string[] {
  switch (block.kind) {
    case 'p':
      return [String(block.text)]
    case 'ul':
    case 'ol':
      return (block.items as string[]) ?? []
    case 'code':
      return [String(block.code)]
    case 'callout':
      return [String(block.text)]
    default:
      return []
  }
}

function NavTree({ currentId, onNavigate }: { currentId?: PageId; onNavigate?: () => void }) {
  const { content, locale } = useI18n()
  return (
    <nav aria-label="Documentation">
      <ul className="space-y-5">
        {NAV_GROUPS.map((group) => (
          <li key={group.key}>
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {content.ui.groupLabels[group.key]}
            </p>
            <ul className="space-y-0.5">
              {group.pages.map((id) => {
                const page = content.pages[id]
                const active = id === currentId
                return (
                  <li key={id}>
                    <Link
                      to={`/${locale}/${id}`}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        active
                          ? 'bg-primary/10 font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {page.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { content, locale, setLocale } = useI18n()
  const location = useLocation()
  const params = useParams<{ locale?: string }>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // The locale lives in the URL; keep the provider in sync with it.
  useEffect(() => {
    if ((params.locale === 'pt-BR' || params.locale === 'en') && params.locale !== locale) {
      setLocale(params.locale)
    }
  }, [params.locale, locale, setLocale])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            <span className="font-semibold text-foreground">{content.ui.siteName}</span>
          </Link>
          <span className="hidden rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
            v{VERSION}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden="true">⌕</span>
              <span className="hidden sm:inline">{content.ui.search}</span>
              <kbd className="hidden rounded border border-border px-1 sm:inline">/</kbd>
            </button>
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground lg:hidden"
            >
              {content.ui.menu}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20">
            <NavTree currentId={currentPageId(location.pathname)} />
          </div>
        </aside>

        {menuOpen && (
          <div id="mobile-nav" className="fixed inset-0 z-40 bg-background/95 p-6 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="mb-6 rounded-md border border-border px-3 py-1 text-sm"
            >
              {content.ui.close}
            </button>
            <NavTree currentId={currentPageId(location.pathname)} onNavigate={() => setMenuOpen(false)} />
          </div>
        )}

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground">
          <p>{content.ui.footerNote}</p>
          <p className="mt-1">
            TaskY v{VERSION} · {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function currentPageId(pathname: string): PageId | undefined {
  const parts = pathname.split('/').filter(Boolean)
  const candidate = parts[1]
  return PAGE_IDS.find((id) => id === candidate)
}
