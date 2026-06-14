import { toast } from 'sonner'

type RefreshFn = () => Promise<string | null>

let refreshHandler: RefreshFn | null = null
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string | null) => void
  reject: (err: unknown) => void
}> = []

export function setRefreshHandler(fn: RefreshFn) {
  refreshHandler = fn
}

export async function handle401Response(error: Response): Promise<Response | null> {
  if (error.status !== 401 || !refreshHandler) return null

  if (!isRefreshing) {
    isRefreshing = true
    try {
      const newToken = await refreshHandler()
      isRefreshing = false
      pendingRequests.forEach((p) => p.resolve(newToken))
      pendingRequests = []
      return newToken ? new Response(null, { status: 200 }) : null
    } catch (err) {
      isRefreshing = false
      pendingRequests.forEach((p) => p.reject(err))
      pendingRequests = []
      return null
    }
  }

  return new Promise<Response | null>((resolve, reject) => {
    pendingRequests.push({
      resolve: (token: string | null) => resolve(token ? new Response(null, { status: 200 }) : null),
      reject,
    })
  })
}

export function handle403Response(): void {
  toast.error('You do not have permission to perform this action')
}

export function handle429Response(error: Response): void {
  const retryAfter = error.headers.get('Retry-After') || '30'
  toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`)
}

export function handleNetworkError(): void {
  toast.error('Network error. Please check your connection.')
}
