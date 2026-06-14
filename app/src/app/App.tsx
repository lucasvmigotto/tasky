import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { router } from '@/app/router'
import { LoadingPage } from '@/shared/components/feedback/LoadingPage'

export default function App() {
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    const store = useAuthStore.getState()
    store.restore()
  }, [])

  if (isLoading) {
    return <LoadingPage />
  }

  return <RouterProvider router={router} />
}
