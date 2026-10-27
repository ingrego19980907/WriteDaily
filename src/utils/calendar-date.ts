export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

/** Calendar fields are local; never derive a calendar day via toISOString(). */
export function localCalendarDate(now: Date): string | null {
  const value = `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return isCalendarDate(value) ? value : null
}

/** Gregorian day number, independent of 23/25-hour daylight-saving days. */
export function calendarDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  const previous = year - 1
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const beforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return (
    previous * 365 +
    Math.floor(previous / 4) -
    Math.floor(previous / 100) +
    Math.floor(previous / 400) +
    beforeMonth[month - 1] +
    (leap && month > 2 ? 1 : 0) +
    day
  )
}

export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(12, 0, 0, 0)
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}
