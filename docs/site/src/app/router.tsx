import { RouterProvider, createHashRouter } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { I18nProvider } from '../i18n'
import { DocPageView, HomeRedirect, NotFound } from '../pages/DocPageView'

// HashRouter: the static host has no SPA fallback, so hash routing keeps
// deep links working (and .md/llms output is generated separately).
// basename matches the docs-hub prefix (ADR 0001 in lucas/docs).
const router = createHashRouter(
  [
    {
      path: '/',
      element: (
        <Layout>
          <HomeRedirect />
        </Layout>
      ),
    },
    {
      path: '/:locale/:pageId',
      element: (
        <Layout>
          <DocPageView />
        </Layout>
      ),
    },
    {
      path: '*',
      element: (
        <Layout>
          <NotFound />
        </Layout>
      ),
    },
  ],
  {
    // Matches the docs-hub prefix (ADR 0001 in lucas/docs); derived from the
    // Vite base so it tracks VITE_BASE_PATH.
    basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
  },
)

export function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  )
}
