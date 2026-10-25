import { useId } from 'react'
import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Button } from '../../components/ui/Button'
import type { Book } from './book'
import { BookCover } from './BookCover'
import { BookDetailsDialog } from './BookDetailsDialog'
import { CoverImage } from './CoverImage'
import { DeleteBook } from './DeleteBook'
import './book-card.css'

const copy = en.library
const numbers = new Intl.NumberFormat('en')

export function BookCard({
  book,
  onSaved,
  onDeleted,
  onOpen,
  opening = false,
}: {
  book: Book
  onSaved: (book: Book) => void
  onDeleted: (book: Book, cleanupPending?: boolean) => void
  onOpen?: (book: Book) => void
  opening?: boolean
}) {
  const id = useId()
  return (
    <Card className="book-card" role="article" aria-labelledby={`${id}-title`}>
      <div className="book-card__overview">
        <CoverImage book={book} />
        <div className="book-card__content">
          <h3 id={`${id}-title`} className="book-card__title">
            {book.title}
          </h3>
          {book.completedAt && (
            <p className="book-card__completion">{copy.completed}</p>
          )}
          <p className="text-secondary">
            {book.targetWordCount === null
              ? copy.noTarget
              : copy.wordTarget(numbers.format(book.targetWordCount))}
          </p>
          <ProgressBar
            label={copy.writingProgress}
            value={null}
            max={book.targetWordCount ?? 100}
            aria-valuetext={copy.wordCountUnavailable}
            aria-describedby={`${id}-progress-hint`}
          />
          <p id={`${id}-progress-hint`} className="text-secondary">
            {copy.wordCountUnavailable}
          </p>
          <div className="book-card__actions">
            {onOpen && (
              <Button disabled={opening} onClick={() => onOpen(book)}>
                {opening ? copy.opening : copy.open}
              </Button>
            )}
            <BookDetailsDialog book={book} onSaved={onSaved} />
            <DeleteBook book={book} onDeleted={onDeleted} />
          </div>
        </div>
      </div>
      <details className="book-card__cover-settings">
        <summary>{copy.manageCover}</summary>
        <BookCover book={book} onSaved={onSaved} showPreview={false} />
      </details>
    </Card>
  )
}
