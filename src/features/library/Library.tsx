import { useCallback, useEffect, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { bookErrorCode, listBooks } from '../../services/books'
import type { Book } from './book'
import { CreateBook } from './CreateBook'
import { BookDetailsDialog } from './BookDetailsDialog'

const copy = en.library

export function Library() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const request = useRef(0)

  const load = useCallback(() => {
    const current = ++request.current
    return listBooks().then(
      (loaded) => {
        if (request.current !== current) return
        // A create/update may commit while the initial list request is in flight.
        setBooks((previous) => [
          ...loaded.map((book) => {
            const committed = previous.find((item) => item.id === book.id)
            return committed && committed.updatedAt > book.updatedAt
              ? committed
              : book
          }),
          ...previous.filter(
            (book) => !loaded.some((item) => item.id === book.id),
          ),
        ])
        setLoading(false)
      },
      (error: unknown) => {
        if (request.current !== current) return
        setFailure(
          bookErrorCode(error) === 'desktop_required'
            ? copy.desktop
            : copy.loadFailure,
        )
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    void load()
    return () => {
      request.current += 1
    }
  }, [load])

  function saved(book: Book) {
    setLoading(false)
    setFailure('')
    setBooks((previous) =>
      previous.some((item) => item.id === book.id)
        ? previous.map((item) => (item.id === book.id ? book : item))
        : [book, ...previous],
    )
  }

  return (
    <div className="space-y-4">
      <CreateBook onSaved={saved} />
      <h2 className="font-semibold">{copy.books}</h2>
      {loading && <p role="status">{copy.loading}</p>}
      {failure && (
        <div className="space-y-2">
          <p role="alert">{failure}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setLoading(true)
              setFailure('')
              void load()
            }}
          >
            {copy.retry}
          </Button>
        </div>
      )}
      {!loading && !failure && books.length === 0 && (
        <p className="text-secondary">{copy.empty}</p>
      )}
      <ul className="space-y-4" aria-label={copy.books}>
        {books.map((book) => (
          <li key={book.id} className="space-y-2">
            <h3 className="font-writing text-writing break-words">
              {book.title}
            </h3>
            <BookDetailsDialog book={book} onSaved={saved} />
          </li>
        ))}
      </ul>
    </div>
  )
}
