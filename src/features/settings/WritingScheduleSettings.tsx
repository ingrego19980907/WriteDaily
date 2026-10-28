import { useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import { saveWritingSchedule } from '../../services/schedule'
import { formatCalendarDate } from '../../utils/calendar-date'
import { everyDay } from './writing-schedule'
import { useWritingSchedule } from './writing-schedule-context'

export function WritingScheduleSettings() {
  const copy = en.schedule
  const plan = useWritingSchedule()!
  const today = useLocalCalendarDate()
  const [draft, setDraft] = useState<{
    revision: number
    weekdays: number[]
  } | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const inFlight = useRef(false)
  const days =
    draft?.weekdays ??
    plan.data?.history.at(-1)?.weekdays ??
    (plan.data ? everyDay : [])
  async function save() {
    if (
      inFlight.current ||
      !plan.data ||
      !today ||
      (!draft && plan.data.history.length > 0)
    )
      return
    inFlight.current = true
    setPending(true)
    setMessage('')
    try {
      const result = await saveWritingSchedule(
        draft?.revision ?? plan.data.revision,
        days,
        today,
      )
      plan.accept(result)
      setDraft(null)
      setMessage(
        copy.saved(formatCalendarDate(result.history.at(-1)!.effectiveFrom)),
      )
    } catch (error) {
      setMessage(
        typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'conflict'
          ? copy.conflict
          : copy.failure,
      )
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  return (
    <Card className="space-y-4 min-w-0 [overflow-wrap:anywhere]">
      <h2 className="font-writing text-writing">{copy.title}</h2>
      <p className="text-secondary">{copy.explanation}</p>
      {plan.loading && <p>{copy.loading}</p>}
      {plan.failed && <p role="alert">{copy.unavailable}</p>}
      <fieldset
        disabled={pending || !plan.data || plan.loading}
        className="space-y-3 min-w-0"
      >
        <legend className="font-semibold max-w-full">{copy.choose}</legend>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <label
              key={day}
              className="inline-flex min-w-0 max-w-full min-h-11 items-center gap-2 rounded-control border border-border px-3"
            >
              <input
                type="checkbox"
                checked={days.includes(day)}
                onChange={(event) => {
                  const selected = event.target.checked
                    ? [...days, day].sort((a, b) => a - b)
                    : days.filter((value) => value !== day)
                  setDraft({
                    revision: draft?.revision ?? plan.data!.revision,
                    weekdays: selected,
                  })
                  setMessage('')
                }}
              />
              {copy.weekdays[day]}
            </label>
          ))}
        </div>
        {(plan.data || draft) && (
          <p className="text-secondary text-sm">
            {days.length === 0 ? copy.paused : copy.emptyHint}
          </p>
        )}
      </fieldset>
      {plan.data?.history.at(-1) && (
        <p className="text-secondary text-sm">
          {copy.effective(
            formatCalendarDate(plan.data.history.at(-1)!.effectiveFrom),
          )}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={
            pending ||
            plan.loading ||
            !plan.data ||
            !today ||
            (!draft && plan.data.history.length > 0)
          }
          onClick={() => {
            void save()
          }}
        >
          {pending ? copy.saving : copy.save}
        </Button>
        <Button
          variant="secondary"
          disabled={pending || plan.loading}
          onClick={() => {
            setDraft(null)
            setMessage('')
            void plan.reload()
          }}
        >
          {copy.reload}
        </Button>
      </div>
    </Card>
  )
}
