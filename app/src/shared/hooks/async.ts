import { useCallback, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: false, error: null })

  const execute = useCallback(async (promise: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await promise()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      setState({ data: null, loading: false, error: message })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue((v) => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])
  return { value, toggle, setTrue, setFalse, set: setValue }
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initial
    } catch {
      return initial
    }
  })

  const setValue = useCallback(
    (value: T | ((v: T) => T)) => {
      const next = value instanceof Function ? value(stored) : value
      setStored(next)
      localStorage.setItem(key, JSON.stringify(next))
    },
    [key, stored],
  )

  return [stored, setValue] as const
}
