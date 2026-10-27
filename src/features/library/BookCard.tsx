import { useId } from 'react'
import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import { BookProgress } from './BookProgress'
import { Button } from '../../components/ui/Button'
import type { Book } from './book'
import { BookActions } from './BookActions'
import { CoverImage } from './CoverImage'
import './book-card.css'

const copy = en.library
const numbers = new Intl.NumberFormat('en')

export function BookCard({
  book,
  onSaved,
  onDeleted,
  onOpen,
  opening = false,
  wordCount,
}: {
  book: Book
  onSaved: (book: Book) => void
  onDeleted: (book: Book, cleanupPending?: boolean) => void
  onOpen?: (book: Book) => void
  opening?: boolean
  wordCount?: number | null
}) {
  const id = useId()
  return (
    <Card className="book-card" role="article" aria-labelledby={`${id}-title`}>
      <BookActions book={book} onSaved={onSaved} onDeleted={onDeleted} />
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
          <BookProgress
            wordCount={wordCount}
            targetWordCount={book.targetWordCount}
          />
          <div className="book-card__actions">
            {onOpen && (
              <Button disabled={opening} onClick={() => onOpen(book)}>
                {opening ? copy.opening : copy.open}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
