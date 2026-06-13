export function getConfig() {
  const win = window.__TASKY_CONFIG__ || {}

  return {
    demoMode: win.DEMO_MODE || import.meta.env.VITE_DEMO_MODE || 'true',
    googleClientId: win.GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  }
}
