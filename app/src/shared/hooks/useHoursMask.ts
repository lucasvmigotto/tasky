import { useCallback, useState, useRef, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react'

function applyMask(digits: string): string {
  const d = digits.slice(0, 4).padEnd(4, '0')
  return `${d[0]}${d[1]}:${d[2]}${d[3]}`
}

export function useHoursMask() {
  const [value, setValue] = useState('00:00')
  const [digits, setDigits] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const onlyDigits = raw.replace(/\D/g, '')

    if (onlyDigits.length <= 4) {
      setDigits(onlyDigits)
      const masked = onlyDigits.length === 0
        ? '00:00'
        : applyMask(onlyDigits)
      setValue(masked)
    }

    const cursor = e.target.selectionStart ?? 0
    requestAnimationFrame(() => {
      try {
        const el = e.target
        const pos = Math.min(cursor, el.value.length - 1)
        el.setSelectionRange(pos, pos)
      } catch {}
    })
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const cursor = el.selectionStart ?? 0
    const totalLen = el.value.length

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const skipColon = (pos: number) => {
        if (el.value[pos] === ':') return e.key === 'ArrowLeft' ? pos - 1 : pos + 1
        return pos
      }
      e.preventDefault()
      const newPos = e.key === 'ArrowLeft'
        ? skipColon(Math.max(0, cursor - 1))
        : skipColon(Math.min(totalLen, cursor + 1))
      el.setSelectionRange(newPos, newPos)
      return
    }

    if (e.key === 'Backspace') {
      e.preventDefault()
      let newCursor = cursor
      if (cursor > 0) {
        const charBefore = el.value[cursor - 1]
        if (charBefore === ':') {
          newCursor = cursor - 2
        } else {
          newCursor = cursor - 1
        }
      }
      const newDigits = digits.slice(0, Math.max(0, newCursor - Math.floor(newCursor / 3)))
      setDigits(newDigits)
      const masked = newDigits.length === 0 ? '00:00' : applyMask(newDigits)
      setValue(masked)
      const tc = Math.max(0, newCursor)
      requestAnimationFrame(() => el.setSelectionRange(tc, tc))
    }

    if (e.key === 'Delete') {
      e.preventDefault()
      const pos = Math.floor(cursor / 3) * 2 + Math.min(cursor % 3, 2)
      const newDigits = digits.slice(0, pos) + digits.slice(pos + 1)
      if (newDigits.length <= 4) {
        setDigits(newDigits)
        const masked = newDigits.length === 0 ? '00:00' : applyMask(newDigits)
        setValue(masked)
        requestAnimationFrame(() => el.setSelectionRange(cursor, cursor))
      }
    }

    if (e.key === 'Home') {
      e.preventDefault()
      requestAnimationFrame(() => el.setSelectionRange(0, 0))
    }
    if (e.key === 'End') {
      e.preventDefault()
      requestAnimationFrame(() => el.setSelectionRange(totalLen, totalLen))
    }
  }, [digits])

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    requestAnimationFrame(() => {
      const el = e.target
      const pos = digits.length === 0 ? 0 : Math.min(digits.length + Math.floor(digits.length / 2), el.value.length)
      el.setSelectionRange(pos, pos)
    })
  }, [digits])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const onlyDigits = text.replace(/\D/g, '').slice(0, 4)
    if (onlyDigits) {
      setDigits(onlyDigits)
      setValue(applyMask(onlyDigits))
    }
  }, [])

  const getDecimal = useCallback((): number => {
    if (!digits) return 0
    const d = digits.padEnd(4, '0')
    const h = parseInt(d.slice(0, 2), 10)
    const m = parseInt(d.slice(2, 4), 10)
    return h + m / 60
  }, [digits])

  const reset = useCallback(() => {
    setValue('00:00')
    setDigits('')
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
  }
}
