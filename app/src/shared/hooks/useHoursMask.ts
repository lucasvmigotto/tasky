import { useCallback, useState, useRef, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react'

function formatMask(digits: string): string {
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function useHoursMask() {
  const [value, setValue] = useState('')
  const [digits, setDigitsState] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 4)
    setDigitsState(clean)
    setValue(formatMask(clean))
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
    }
  }, [])

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    requestAnimationFrame(() => e.target.select())
  }, [])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const clean = text.replace(/\D/g, '').slice(0, 4)
    if (clean) {
      setDigitsState(clean)
      setValue(formatMask(clean))
    }
  }, [])

  const getDecimal = useCallback((): number => {
    if (!digits) return 0
    if (digits.length <= 2) {
      const hours = parseInt(digits, 10) || 0
      return hours <= 24 ? hours : 0
    }
    const padded = digits.padStart(4, '0')
    const h = parseInt(padded.slice(0, 2), 10)
    const m = parseInt(padded.slice(2, 4), 10)
    if (h > 24 || m > 59 || (h === 24 && m > 0)) return 0
    return h + m / 60
  }, [digits])

  const reset = useCallback(() => {
    setValue('')
    setDigitsState('')
  }, [])

  const setDigits = useCallback((d: string) => {
    const clean = d.replace(/\D/g, '').slice(0, 4)
    setDigitsState(clean)
    setValue(formatMask(clean))
  }, [])

  return {
    value,
    setValue,
    digits,
    inputRef,
    handleChange,
    handleKeyDown,
    handleFocus,
    handlePaste,
    getDecimal,
    reset,
    setDigits,
  }
}

export function hoursToMaskDigits(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60))
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}`
}
