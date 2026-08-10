import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/app/providers/AppProviders'
import App from '@/app/App'
import '@/styles/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Ensure there is a <div id="root"></div> in your index.html.')
}

const preloadReloadKey = 'tasky_vite_preload_reload'
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (sessionStorage.getItem(preloadReloadKey) === '1') {
    console.error('[TaskY] Asset preload failed again; keeping the current page.', event.payload)
    return
  }
  sessionStorage.setItem(preloadReloadKey, '1')
  window.location.reload()
})
window.setTimeout(() => sessionStorage.removeItem(preloadReloadKey), 10_000)

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
