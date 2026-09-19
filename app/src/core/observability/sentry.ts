import * as Sentry from '@sentry/react'
import { getConfig } from '@/core/config/runtimeConfig'

let initialized = false

export function initSentry(): void {
  if (initialized) return
  initialized = true
  const dsn = getConfig().sentryDsn
  if (!dsn) {
    return
  }
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      // Scrub e-mails from user context; keep a stable hash instead.
      const email = event.user?.email
      if (email) {
        event.user = { ...event.user, email: undefined, id: hashEmail(email) }
      }
      return event
    },
  })
}

function hashEmail(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) | 0
  }
  return `email:${(hash >>> 0).toString(16)}`
}

export function captureAppError(error: unknown): void {
  if (!getConfig().sentryDsn) return
  Sentry.captureException(error)
}
