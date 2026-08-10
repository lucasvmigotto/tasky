import { create } from 'zustand'
import type { TimeEntryResponse } from '@/core/api/types'

let ticker: ReturnType<typeof setInterval> | null = null
let lastTick = 0

function startTicker() {
  if (ticker) return
  lastTick = Date.now()
  ticker = setInterval(() => {
    useTimeTrackerStore.getState().tick()
  }, 1000)
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
}

function format(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function elapsedFor(entry: TimeEntryResponse) {
  const started = Date.parse(entry.startTime)
  const ended = entry.endTime ? Date.parse(entry.endTime) : entry.pausedAt ? Date.parse(entry.pausedAt) : Date.now()
  return Math.max(0, Math.floor((ended - started) / 1000) - (entry.pausedSeconds ?? 0))
}

interface TimeTrackerState {
  entry: TimeEntryResponse | null
  elapsed: number
  isRunning: boolean
  formattedTime: string
  setEntry: (entry: TimeEntryResponse) => void
  start: (entry: TimeEntryResponse) => void
  tick: () => void
  pause: () => void
  resume: () => void
  stop: () => number
  reset: () => void
}

export const useTimeTrackerStore = create<TimeTrackerState>((set, get) => ({
  entry: null,
  elapsed: 0,
  isRunning: false,
  formattedTime: '00:00:00',

  setEntry: (entry) => {
    const elapsed = elapsedFor(entry)
    const isRunning = !entry.pausedAt && !entry.endTime
    set({ entry, elapsed, isRunning, formattedTime: format(elapsed) })
    if (isRunning) startTicker()
    else stopTicker()
  },

  start: (entry) => {
    set({ entry, elapsed: 0, isRunning: true, formattedTime: '00:00:00' })
    startTicker()
  },

  tick: () => {
    if (!get().isRunning) return
    const now = Date.now()
    const delta = Math.floor((now - lastTick) / 1000)
    if (delta <= 0) return
    lastTick = now
    const elapsed = get().elapsed + delta
    set({ elapsed, formattedTime: format(elapsed) })
  },

  pause: () => {
    if (!get().isRunning) return
    get().tick()
    stopTicker()
    set({ isRunning: false })
  },

  resume: () => {
    if (get().isRunning) return
    set({ isRunning: true })
    startTicker()
  },

  stop: () => {
    get().tick()
    stopTicker()
    const elapsed = get().elapsed
    set({ entry: null, elapsed: 0, isRunning: false, formattedTime: '00:00:00' })
    return elapsed
  },

  reset: () => {
    stopTicker()
    set({ entry: null, elapsed: 0, isRunning: false, formattedTime: '00:00:00' })
  },
}))
