import { useCallback, useEffect, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { bookErrorCode, listBooks } from '../../services/books'
import type { Book } from './book'
import { CreateBook } from './CreateBook'
import { BookCard } from './BookCard'

const copy = en.library

export function Library() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState('')
  const request = useRef(0)
  const deletedIds = useRef(new Set<string>())
  const heading = useRef<HTMLHeadingElement>(null)
  const [deleted, setDeleted] = useState('')
  const [cleanupPending, setCleanupPending] = useState(false)

  const load = useCallback(() => {
    const current = ++request.current
    return listBooks().then(
      (loaded) => {
        if (request.current !== current) return
        // A create/update may commit while the initial list request is in flight.
        setBooks((previous) => [
          ...loaded
            .filter((book) => !deletedIds.current.has(book.id))
            .map((book) => {
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

  function removed(book: Book, pendingCleanup = false) {
    deletedIds.current.add(book.id)
    setBooks((previous) => previous.filter((item) => item.id !== book.id))
    setDeleted(book.title)
    setCleanupPending(pendingCleanup)
    requestAnimationFrame(() => heading.current?.focus())
  }

  return (
    <div className="space-y-4">
      <CreateBook onSaved={saved} />
      <h2 ref={heading} tabIndex={-1} className="font-semibold">
        {copy.books}
      </h2>
      <p role="status">{deleted ? `${copy.deleted} ${deleted}` : ''}</p>
      {cleanupPending && <p role="status">{copy.coverCleanupPending}</p>}
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
            <BookCard book={book} onSaved={saved} onDeleted={removed} />
          </li>
        ))}
      </ul>
    </div>
  )
}
