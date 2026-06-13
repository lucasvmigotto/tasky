import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/app/providers/AppProviders'
import App from '@/app/App'
import '@/styles/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Ensure there is a <div id="root"></div> in your index.html.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
