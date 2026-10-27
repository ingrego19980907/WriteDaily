import { en } from '../../app/i18n/en'

const numbers = new Intl.NumberFormat('en')

/** Saved target only; today's credited activity is a separate domain. */
export function DailyGoal({ value }: { value: number | null }) {
  return (
    <p className="text-secondary break-words">
      {value === null
        ? en.library.noDailyGoal
        : Number.isSafeInteger(value) && value > 0
          ? en.library.dailyGoalSummary(numbers.format(value))
          : en.library.dailyGoalUnavailable}
    </p>
  )
}
