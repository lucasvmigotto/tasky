import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { getDemoAuth } from '@/core/auth/demoAuth'
import { getConfig } from '@/core/config/runtimeConfig'
import { router } from '@/app/router'
import { LoadingPage } from '@/shared/components/feedback/LoadingPage'

export default function App() {
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    const config = getConfig()
    const store = useAuthStore.getState()

    if (config.demoMode === 'true') {
      const demo = getDemoAuth()
      store.setDemoMode()
      store.login(demo.token, demo.user, demo.organizations)
    } else {
      store.restore()
    }
  }, [])

  if (isLoading) {
    return <LoadingPage />
  }

  return <RouterProvider router={router} />
}
