const CACHE: Record<string, unknown> = {}

function cacheGet<T>(key: string): T | undefined {
  return CACHE[key] as T | undefined
}

function cacheSet(key: string, value: unknown) {
  CACHE[key] = value
}

export const storage = {
  get<T>(key: string): T | null {
    try {
      const cached = cacheGet<T>(key)
      if (cached !== undefined) return cached
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as T
      cacheSet(key, parsed)
      return parsed
    } catch {
      return null
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      cacheSet(key, value)
    } catch {
      // quota exceeded or private browsing
    }
  },
  remove(key: string) {
    localStorage.removeItem(key)
    delete CACHE[key]
  },
  clear() {
    localStorage.clear()
    Object.keys(CACHE).forEach((k) => delete CACHE[k])
  },
}
