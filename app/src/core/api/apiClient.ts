export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  if (response.status === 401) {
    const { handle401Response } = await import('./interceptors')
    const result = await handle401Response(response)
    if (result) {
      return request<T>(path, options)
    }
    return undefined as T
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
    const text = await response.text()
    let message: string
    try {
      const json = JSON.parse(text)
      message = json.detail || json.message || json.error || text
    } catch {
      message = text || `Request failed with status ${response.status}`
    }
    throw new ApiError(response.status, message)
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
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' })
  },
}
