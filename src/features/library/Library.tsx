import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { bookErrorCode, listBooks } from '../../services/books'
import type { Book } from './book'
import { CreateBook } from './CreateBook'
import { CountedBookCard } from './CountedBookCard'
import { CurrentStreakSummary } from '../activity/CurrentStreakSummary'
import { WritingStatisticsSummary } from './WritingStatisticsSummary'
import { BookFilters } from './BookFilters'
import {
  countBookFilters,
  filterBooks,
  searchBooks,
  type BookFilter,
} from './book-filters'
import { LibraryViewControls, type LibraryView } from './LibraryViewControls'
import { LibraryEmptyState } from './LibraryEmptyState'
import './library-layout.css'

const copy = en.library

export function Library({
  onOpenBook,
  openingId,
  openFailure,
  onBookSaved,
  onBookDeleted,
  active = true,
  countsVersion = 0,
  statisticsTarget,
}: {
  active?: boolean
  countsVersion?: number
  statisticsTarget?: HTMLDivElement | null
  onOpenBook?: (book: Book) => void
  openingId?: string | null
  openFailure?: string
  onBookSaved?: (book: Book) => void
  onBookDeleted?: (id: string) => void
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [filter, setFilter] = useState<BookFilter>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<LibraryView>('grid')
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [desktopOnly, setDesktopOnly] = useState(false)
  const [failure, setFailure] = useState('')
  const request = useRef(0)
  const deletedIds = useRef(new Set<string>())
  const heading = useRef<HTMLHeadingElement>(null)
  const retry = useRef<HTMLButtonElement>(null)
  const retryHadFocus = useRef(false)
  const [deleted, setDeleted] = useState('')
  const [cleanupPending, setCleanupPending] = useState(false)
  const [createTriggerTarget, setCreateTriggerTarget] =
    useState<HTMLDivElement | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    const current = ++request.current
    return listBooks().then(
      (loaded) => {
        if (request.current !== current) return
        const restoreFocus =
          retryHadFocus.current &&
          (document.activeElement === retry.current ||
            document.activeElement === document.body)
        retryHadFocus.current = false
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
        setHasLoaded(true)
        setFailure('')
        setDesktopOnly(false)
        if (restoreFocus) requestAnimationFrame(() => heading.current?.focus())
      },
      (error: unknown) => {
        if (request.current !== current) return
        const restoreFocus =
          retryHadFocus.current && document.activeElement === document.body
        retryHadFocus.current = false
        setDesktopOnly(bookErrorCode(error) === 'desktop_required')
        setFailure(
          bookErrorCode(error) === 'desktop_required'
            ? copy.desktop
            : copy.loadFailure,
        )
        setLoading(false)
        if (restoreFocus) requestAnimationFrame(() => retry.current?.focus())
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
    onBookSaved?.(book)
    setBooks((previous) =>
      previous.some((item) => item.id === book.id)
        ? previous.map((item) => (item.id === book.id ? book : item))
        : [book, ...previous],
    )
  }

  function removed(book: Book, pendingCleanup = false) {
    onBookDeleted?.(book.id)
    deletedIds.current.add(book.id)
    setBooks((previous) => previous.filter((item) => item.id !== book.id))
    setDeleted(book.title)
    setCleanupPending(pendingCleanup)
    requestAnimationFrame(() => heading.current?.focus())
  }

  const visibleBooks = searchBooks(filterBooks(books, filter), query)
  const filterCounts = hasLoaded ? countBookFilters(books) : null
  return (
    <div className="library-screen">
      <div className="library-primary-toolbar">
        <h2 ref={heading} tabIndex={-1} className="library-collection-title">
          {copy.books}
        </h2>
        <div className="library-toolbar-actions">
          <LibraryViewControls
            searchRef={searchInput}
            query={query}
            view={view}
            onQueryChange={setQuery}
            onViewChange={setView}
          />
          <CreateBook
            onSaved={saved}
            additionalTriggerTarget={createTriggerTarget}
          />
        </div>
      </div>
      {openFailure && (
        <p role="alert" className="text-error">
          {openFailure}
        </p>
      )}
      <p role="status" className="library-notice">
        {deleted ? `${copy.deleted} ${deleted}` : ''}
      </p>
      {cleanupPending && <p role="status">{copy.coverCleanupPending}</p>}
      {loading && <p role="status">{copy.loading}</p>}
      {failure && (
        <Card className="space-y-2">
          <h3 className="font-semibold">
            {desktopOnly ? copy.desktopTitle : copy.loadErrorTitle}
          </h3>
          <p role="alert">{failure}</p>
          {!desktopOnly && (
            <Button
              ref={retry}
              disabled={loading}
              variant="secondary"
              onClick={() => {
                retryHadFocus.current = document.activeElement === retry.current
                setLoading(true)
                void load()
              }}
            >
              {loading ? copy.retrying : copy.retry}
            </Button>
          )}
        </Card>
      )}
      <BookFilters
        value={filter}
        counts={filterCounts}
        loading={loading}
        onChange={setFilter}
      />
      <p role="status" className="sr-only">
        {hasLoaded && !loading && !failure
          ? en.libraryView.results(visibleBooks.length)
          : ''}
      </p>
      {hasLoaded && !loading && !failure && books.length === 0 && (
        <LibraryEmptyState kind="library">
          <div ref={setCreateTriggerTarget} />
        </LibraryEmptyState>
      )}
      {hasLoaded &&
        !loading &&
        !failure &&
        books.length > 0 &&
        visibleBooks.length === 0 && (
          <LibraryEmptyState kind={query.trim() ? 'search' : 'filter'}>
            <Button
              variant="secondary"
              onClick={() => {
                if (query.trim()) {
                  setQuery('')
                  searchInput.current?.focus()
                } else setFilter('all')
              }}
            >
              {query.trim()
                ? en.libraryView.clearSearch
                : en.libraryFilters.labels.all}
            </Button>
          </LibraryEmptyState>
        )}
      <ul
        className={view === 'grid' ? 'library-grid' : 'library-list'}
        aria-label={copy.books}
        aria-busy={loading}
      >
        {visibleBooks.map((book) => (
          <li key={book.id} className="space-y-2">
            <CountedBookCard
              active={active}
              countsVersion={countsVersion}
              book={book}
              onSaved={saved}
              onDeleted={removed}
              onOpen={onOpenBook}
              opening={openingId === book.id}
            />
          </li>
        ))}
      </ul>
      <div className="library-history">
        <CurrentStreakSummary active={active} refreshVersion={countsVersion}>
          {(snapshot) =>
            active && statisticsTarget
              ? createPortal(
                  <WritingStatisticsSummary {...snapshot} />,
                  statisticsTarget,
                )
              : null
          }
        </CurrentStreakSummary>
      </div>
    </div>
  )
}
