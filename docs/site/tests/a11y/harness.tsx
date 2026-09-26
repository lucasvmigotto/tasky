import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '../../src/components/Layout'
import { I18nProvider, STORAGE_KEY } from '../../src/i18n'
import type { PageId } from '../../src/i18n/types'
import { DocPageView } from '../../src/pages/DocPageView'

export function renderPage(pageId: PageId, locale: 'pt-BR' | 'en' = 'pt-BR') {
  // readStoredLocale() takes precedence over navigator detection, which in
  // jsdom would otherwise resolve to en-US.
  localStorage.setItem(STORAGE_KEY, locale)
  const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>
  return render(
    <MemoryRouter initialEntries={[`/${locale}/${pageId}`]}>
      <Routes>
        <Route
          path="/:locale/:pageId"
          element={
            <Layout>
              <DocPageView />
            </Layout>
          }
        />
      </Routes>
    </MemoryRouter>,
    { wrapper },
  )
}
