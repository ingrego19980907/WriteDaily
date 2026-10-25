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
        <p className="text-secondary">
          {progress.excess > 0
            ? copy.aboveTarget(numbers.format(progress.excess))
            : progress.remaining > 0
              ? copy.wordsRemaining(numbers.format(progress.remaining))
              : copy.targetReached}
        </p>
      )}
    </div>
  )
}
