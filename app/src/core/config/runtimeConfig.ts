export function getConfig() {
  const win = (window as any).__TASKY_CONFIG__ || {}
  return {
    demoMode: win.DEMO_MODE ?? import.meta.env.VITE_DEMO_MODE ?? 'false',
    googleClientId: win.GOOGLE_CLIENT_ID ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
    microsoftClientId: win.MICROSOFT_CLIENT_ID ?? import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? '',
    mockOAuth2Enabled: win.MOCK_OAUTH2_ENABLED ?? import.meta.env.VITE_MOCK_OAUTH2_ENABLED ?? 'false',
    mockOAuth2Url: win.MOCK_OAUTH2_URL ?? import.meta.env.VITE_MOCK_OAUTH2_URL ?? 'http://localhost:48080',
    sentryDsn: win.SENTRY_DSN ?? import.meta.env.VITE_SENTRY_DSN ?? '',
  }
}
