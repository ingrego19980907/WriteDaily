import { useId } from 'react'
import { en } from '../../app/i18n/en'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { calculateBookProgress } from './book-progress'
import './book-card-progress.css'

const copy = en.library
const numbers = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })

/** Card-only presentation of the existing committed-word calculation. */
export function BookCardProgress({
  wordCount,
  targetWordCount,
  details = false,
}: {
  wordCount?: number | null
  targetWordCount: number | null
  details?: boolean
}) {
  const id = useId()
  const state = calculateBookProgress(wordCount, targetWordCount)
  const description =
    state.kind === 'determinate'
      ? copy.progressSummary(
          numbers.format(state.words),
          numbers.format(state.target),
          numbers.format(state.percentage),
        )
      : copy.wordCountUnavailable
  if (details) {
    if (state.kind === 'unknown') return null
    if (state.kind === 'no_target') return <p>{copy.progressNoTarget}</p>
    return (
      <div className="space-y-1">
        <p>{description}</p>
        {state.reached && (
          <p className="text-accent-strong font-semibold">
            {copy.targetReached}
          </p>
        )}
        {(state.excess > 0 || !state.reached) && (
          <p>
            {state.excess > 0
              ? copy.aboveTarget(numbers.format(state.excess))
              : copy.wordsRemaining(numbers.format(state.remaining))}
          </p>
        )}
      </div>
    )
  }
  if (state.kind === 'no_target')
    return (
      <p className="book-card-progress__count">
        {copy.wordsWritten(numbers.format(state.words))}
      </p>
    )
  if (state.target === null)
    return (
      <p className="book-card-progress__count">{copy.wordCountUnavailable}</p>
    )
  return (
    <div
      className="book-card-progress"
      data-reached={state.kind === 'determinate' && state.reached}
    >
      <div className="book-card-progress__row">
        <ProgressBar
          label={copy.writingProgress}
          value={state.kind === 'determinate' ? state.words : null}
          max={state.target}
          aria-valuetext={description}
          aria-describedby={id}
        />
        <span className="book-card-progress__percentage" aria-hidden="true">
          {state.kind === 'determinate'
            ? copy.progressPercent(numbers.format(state.percentage))
            : '—'}
        </span>
      </div>
      <p id={id} className="book-card-progress__count">
        {state.kind === 'determinate'
          ? copy.progressCounts(
              numbers.format(state.words),
              numbers.format(state.target),
            )
          : copy.wordCountUnavailable}
      </p>
    </div>
  )
}
