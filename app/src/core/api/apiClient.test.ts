import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { server } from '@/test/server'
import { apiClient, apiUrl, setAccessToken, setApiBaseUrl, ApiError, setRefreshExecutor } from '@/core/api/apiClient'

let refreshCalls = 0

beforeAll(() => {
  setApiBaseUrl('http://localhost')
  setRefreshExecutor(async () => {
    refreshCalls++
    const res = await fetch(apiUrl('/auth/refresh'), { method: 'POST', credentials: 'include' })
    if (!res.ok) return null
    const body = (await res.json()) as { token: string }
    setAccessToken(body.token)
    return body.token
  })
})

afterEach(() => {
  refreshCalls = 0
  server.resetHandlers()
  setAccessToken(null)
})

describe('apiClient 401 handling', () => {
  it('refreshes once and retries the original request', async () => {
    setAccessToken('expired-token')
    server.use(
      http.get('http://localhost/api/v1/time-entries', ({ request }) => {
        const auth = request.headers.get('Authorization')
        if (auth === 'Bearer expired-token') {
          return new HttpResponse(null, { status: 401 })
        }
        return HttpResponse.json({ ok: true, auth, refreshed: true })
      }),
    )

    const result = await apiClient.get<{ ok: boolean; refreshed: boolean }>('/time-entries')
    expect(result.refreshed).toBe(true)
    expect(refreshCalls).toBe(1)
  })

  it('throws ApiError when refresh fails', async () => {
    setAccessToken('expired-token')
    server.use(
      http.get('http://localhost/api/v1/time-entries', () => new HttpResponse(null, { status: 401 })),
      http.post('http://localhost/api/v1/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    )
    await expect(apiClient.get('/time-entries')).rejects.toBeInstanceOf(ApiError)
  })

  it('does not retry on the refresh path itself', async () => {
    setAccessToken('token')
    server.use(
      http.post('http://localhost/api/v1/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    )
    await expect(apiClient.post('/auth/refresh')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('single-flight refresh under concurrency', () => {
  it('1 concurrent request triggers exactly one refresh', async () => {
    setAccessToken('expired-token')
    server.use(
      http.get('http://localhost/api/v1/time-entries', ({ request }) => {
        const auth = request.headers.get('Authorization')
        if (auth === 'Bearer expired-token') return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ ok: true })
      }),
    )
    await Promise.all([apiClient.get('/time-entries')])
    expect(refreshCalls).toBe(1)
  })

  it('10 concurrent requests trigger exactly one refresh', async () => {
    setAccessToken('expired-token')
    server.use(
      http.get('http://localhost/api/v1/time-entries', ({ request }) => {
        const auth = request.headers.get('Authorization')
        if (auth === 'Bearer expired-token') return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ ok: true })
      }),
    )
    const results = await Promise.all(Array.from({ length: 10 }, () => apiClient.get('/time-entries')))
    expect(results).toHaveLength(10)
    expect(refreshCalls).toBe(1)
  })

  it('100 concurrent requests trigger exactly one refresh', async () => {
    setAccessToken('expired-token')
    server.use(
      http.get('http://localhost/api/v1/time-entries', ({ request }) => {
        const auth = request.headers.get('Authorization')
        if (auth === 'Bearer expired-token') return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ ok: true })
      }),
    )
    const results = await Promise.all(Array.from({ length: 100 }, () => apiClient.get('/time-entries')))
    expect(results).toHaveLength(100)
    expect(refreshCalls).toBe(1)
  })
})
