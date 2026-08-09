export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let accessToken: string | null = null
const REQUEST_TIMEOUT_MS = 15_000

async function fetchWithTimeout(input: RequestInfo | URL, options: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const externalSignal = options.signal
  const abortExternal = () => controller.abort()
  externalSignal?.addEventListener('abort', abortExternal, { once: true })

  try {
    return await fetch(input, { ...options, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortExternal)
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

function isRefreshPath(path: string): boolean {
  return path === '/auth/refresh' || path === '/auth/google' || path === '/auth/logout'
}

export async function rawRequest<T>(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  return fetchWithTimeout(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

let refreshPromise: Promise<string | null> | null = null

export function setRefreshExecutor(fn: () => Promise<string | null>) {
  refreshExecutor = fn
}

let refreshExecutor: (() => Promise<string | null>) | null = null

async function refreshOnce(): Promise<string | null> {
  if (!refreshExecutor) {
    return null
  }
  refreshPromise ??= refreshExecutor().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function parseErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const json = JSON.parse(text)
    return json.detail || json.message || json.error || text
  } catch {
    return text || `Request failed with status ${response.status}`
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (accessToken && !isRefreshPath(path)) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetchWithTimeout(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 204) {
    return undefined as T
  }

  if (response.status === 401) {
    if (!retried && !isRefreshPath(path)) {
      const token = await refreshOnce()
      if (token) {
        return request<T>(path, options, true)
      }
      const { handleLogout } = await import('./interceptors')
      handleLogout()
    }
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.')
  }

  if (response.status === 403) {
    const { handle403Response } = await import('./interceptors')
    handle403Response()
  }

  if (response.status === 429) {
    const { handle429Response } = await import('./interceptors')
    handle429Response(response)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response))
  }

  return response.json()
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(path)
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' })
  },
  raw<T>(path: string, options: RequestInit = {}) {
    return rawRequest<T>(path, options)
  },
}
