import { useId } from 'react'
import { en } from '../../app/i18n/en'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { calculateBookProgress } from './book-progress'

const copy = en.library
const numbers = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })

export function BookProgress({
  wordCount,
  targetWordCount,
}: {
  wordCount?: number | null
  targetWordCount: number | null
}) {
  const id = useId()
  const progress = calculateBookProgress(wordCount, targetWordCount)
  if (progress.kind === 'no_target')
    return (
      <div className="space-y-2">
        <p>{copy.wordsWritten(numbers.format(progress.words))}</p>
        <p className="text-secondary">{copy.progressNoTarget}</p>
      </div>
    )
  const description =
    progress.kind === 'unknown'
      ? copy.wordCountUnavailable
      : copy.progressSummary(
          numbers.format(progress.words),
          numbers.format(progress.target),
          numbers.format(progress.percentage),
        )
  return (
    <div className="space-y-2">
      <ProgressBar
        label={copy.writingProgress}
        value={progress.kind === 'determinate' ? progress.words : null}
        max={progress.target ?? 100}
        aria-valuetext={description}
        aria-describedby={id}
      />
      <p id={id} className="text-secondary">
        {description}
      </p>
      {progress.kind === 'determinate' && (
        <>
          {progress.reached && (
            <p className="flex items-center gap-2 text-success font-semibold">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </svg>
              {copy.targetReached}
            </p>
          )}
          {(progress.excess > 0 || !progress.reached) && (
            <p className="text-secondary">
              {progress.excess > 0
                ? copy.aboveTarget(numbers.format(progress.excess))
                : copy.wordsRemaining(numbers.format(progress.remaining))}
            </p>
          )}
        </>
      )}
    </div>
  )
}
