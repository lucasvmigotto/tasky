import { useState, useRef, useCallback, useEffect } from 'react'
import type { TimeEntry } from '@/core/types/models'
import { formatDuration } from '@/shared/lib/formatters'

export interface TimerState {
  elapsed: number
  isRunning: boolean
  currentEntry: Partial<TimeEntry> | null
  formattedTime: string
  start: (entry: Partial<TimeEntry>) => void
  stop: () => Partial<TimeEntry> | null
  resume: (entry: Partial<TimeEntry>) => void
  reset: () => void
}

export function useTimer(): TimerState {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<Partial<TimeEntry> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      setElapsed(() => {
        if (startTimeRef.current === null) return 0
        return Math.floor((Date.now() - startTimeRef.current) / 1000)
      })
    }, 1000)
  }, [])

  const start = useCallback((entry: Partial<TimeEntry>) => {
    clearTimer()
    setElapsed(0)
    setIsRunning(true)
    setCurrentEntry({
      ...entry,
      startTime: new Date().toISOString(),
      endTime: null,
    })
    startTimer()
  }, [clearTimer, startTimer])

  const stop = useCallback((): Partial<TimeEntry> | null => {
    if (!isRunning || !currentEntry) return null
    clearTimer()
    setIsRunning(false)
    const endTime = new Date().toISOString()
    const stoppedEntry: Partial<TimeEntry> = {
      ...currentEntry,
      endTime,
      duration: elapsed,
    }
    setCurrentEntry(null)
    setElapsed(0)
    return stoppedEntry
  }, [isRunning, currentEntry, elapsed, clearTimer])

  const resume = useCallback((entry: Partial<TimeEntry>) => {
    const resumeElapsed = entry.duration ?? 0
    setElapsed(resumeElapsed)
    setIsRunning(true)
    setCurrentEntry({
      ...entry,
      startTime: new Date().toISOString(),
      endTime: null,
    })
    startTimeRef.current = Date.now() - resumeElapsed * 1000
    clearTimer()
    intervalRef.current = setInterval(() => {
      setElapsed(() => {
        if (startTimeRef.current === null) return 0
        return Math.floor((Date.now() - startTimeRef.current) / 1000)
      })
    }, 1000)
  }, [clearTimer])

  const reset = useCallback(() => {
    clearTimer()
    setElapsed(0)
    setIsRunning(false)
    setCurrentEntry(null)
    startTimeRef.current = null
  }, [clearTimer])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return {
    elapsed,
    isRunning,
    currentEntry,
    formattedTime: formatDuration(elapsed),
    start,
    stop,
    resume,
    reset,
  }
}
