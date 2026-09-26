export type Locale = 'pt-BR' | 'en'

export const LOCALES: Locale[] = ['pt-BR', 'en']
export const DEFAULT_LOCALE: Locale = 'pt-BR'

/** Truth-first maturity label. Mirrors the skill's classification set. */
export type Maturity = 'implemented' | 'partial' | 'planned' | 'unavailable' | 'upstream' | 'na'

export type PageId =
  | 'overview'
  | 'getting-started'
  | 'architecture'
  | 'domain'
  | 'features'
  | 'security-privacy'
  | 'api'
  | 'testing'
  | 'deployment'
  | 'roadmap'
  | 'limitations'

export const PAGE_IDS: PageId[] = [
  'overview',
  'getting-started',
  'architecture',
  'domain',
  'features',
  'security-privacy',
  'api',
  'testing',
  'deployment',
  'roadmap',
  'limitations',
]

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; lang: string; code: string; caption?: string }
  | { kind: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | { kind: 'shot'; src: string; alt: string; caption: string }
  | { kind: 'callout'; tone: 'info' | 'warning' | 'success'; title?: string; text: string }

export interface Section {
  id: string
  heading: string
  maturity?: Maturity
  blocks: Block[]
}

export interface DocPage {
  id: PageId
  /** SEO/heading title. */
  title: string
  /** One-line description used by nav, search and llms.txt. */
  summary: string
  maturity?: Maturity
  sections: Section[]
}

export interface UiStrings {
  siteName: string
  siteTagline: string
  skipToContent: string
  menu: string
  close: string
  search: string
  searchPlaceholder: string
  searchNoResults: string
  language: string
  theme: string
  themeDark: string
  themeLight: string
  breadcrumbHome: string
  onThisPage: string
  version: string
  footerNote: string
  maturityLabels: Record<Maturity, string>
  groupLabels: Record<string, string>
  notFoundTitle: string
  notFoundText: string
  backHome: string
}

export interface DocsContent {
  ui: UiStrings
  pages: Record<PageId, DocPage>
}

/** Page grouping, shared across locales (structure is not translated). */
export interface NavGroup {
  key: string
  pages: PageId[]
}

export const NAV_GROUPS: NavGroup[] = [
  { key: 'start', pages: ['overview', 'getting-started'] },
  { key: 'understand', pages: ['architecture', 'domain', 'features'] },
  { key: 'operate', pages: ['security-privacy', 'api', 'testing', 'deployment'] },
  { key: 'status', pages: ['roadmap', 'limitations'] },
]
