import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { en } from './locales/en'
import { ptBR } from './locales/pt-BR'
import { DEFAULT_LOCALE, type DocsContent, LOCALES, type Locale } from './types'

const BUNDLES: Record<Locale, DocsContent> = { 'pt-BR': ptBR, en }

export const STORAGE_KEY = 'tasky-docs-locale'

/** Browser-language detection → English fallback (pt-BR for pt-* variants). */
export function detectLocale(
  navLanguages: readonly string[] = navigator.languages ?? [navigator.language],
): Locale {
  for (const tag of navLanguages) {
    const lower = tag.toLowerCase()
    if (lower.startsWith('pt')) return 'pt-BR'
    if (lower.startsWith('en')) return 'en'
  }
  return 'en'
}

export function readStoredLocale(): Locale | null {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return raw === 'pt-BR' || raw === 'en' ? raw : null
}

interface I18nContextValue {
  locale: Locale
  content: DocsContent
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale() ?? detectLocale())

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable (private mode); session-only is fine
    }
  }, [])

  const value = useMemo(() => ({ locale, content: BUNDLES[locale], setLocale }), [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export { DEFAULT_LOCALE, LOCALES }
