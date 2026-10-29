import { useId } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import {
  bookFilters,
  type BookFilter,
  type BookFilterCounts,
} from './book-filters'
import './book-filters.css'

const copy = en.libraryFilters
const numbers = new Intl.NumberFormat('en')
export function BookFilters({
  value,
  counts,
  loading,
  onChange,
}: {
  value: BookFilter
  counts: BookFilterCounts | null
  loading: boolean
  onChange: (filter: BookFilter) => void
}) {
  const description = useId()
  const countDescription = useId()
  return (
    <div className="space-y-2 min-w-0">
      <div
        className="book-filters"
        role="group"
        aria-label={copy.title}
        aria-busy={loading}
        aria-describedby={!counts ? countDescription : undefined}
      >
        {bookFilters.map((filter) => (
          <Button
            key={filter}
            variant="ghost"
            className="book-filters__button"
            aria-pressed={value === filter}
            disabled={!counts}
            aria-label={copy.name(
              copy.labels[filter],
              counts?.[filter] ?? null,
            )}
            onClick={() => onChange(filter)}
          >
            <span>{copy.labels[filter]}</span>{' '}
            <span className="book-filters__count" aria-hidden="true">
              {counts ? numbers.format(counts[filter]) : '—'}
            </span>
          </Button>
        ))}
        <Button
          variant="ghost"
          className="book-filters__button"
          disabled
          aria-describedby={description}
          aria-label={copy.name(copy.archived, null)}
          title={copy.archiveUnavailable}
        >
          <span>{copy.archived}</span>{' '}
          <span className="book-filters__count" aria-hidden="true">
            —
          </span>
        </Button>
      </div>
      {!counts && (
        <p id={countDescription} className="sr-only">
          {loading ? copy.countsLoading : copy.countsUnavailable}
        </p>
      )}
      <p id={description} className="text-secondary text-sm">
        {copy.archiveUnavailable}
      </p>
    </div>
  )
}
