export function getEffectiveTimeZone(timeZone?: string | null) {
  return timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function getOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  }).formatToParts(date)
  const value = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0))
}

export function zonedDateTimeToIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  let utc = Date.UTC(year, month - 1, day, hour || 0, minute || 0)
  let offset = getOffsetMinutes(new Date(utc), timeZone)
  utc = Date.UTC(year, month - 1, day, hour || 0, minute || 0) - offset * 60_000
  offset = getOffsetMinutes(new Date(utc), timeZone)
  utc = Date.UTC(year, month - 1, day, hour || 0, minute || 0) - offset * 60_000
  return new Date(utc).toISOString()
}

export function dateKeyInTimeZone(value: string | Date, timeZone: string) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function formatTimeInTimeZone(value: string, timeZone: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone })
}

export function formatDateInTimeZone(value: string, timeZone: string) {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone })
}
