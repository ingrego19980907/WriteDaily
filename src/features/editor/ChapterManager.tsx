import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { listChapters } from '../../services/chapters'
import type { Book } from '../library/book'
import { BookProgress } from '../library/BookProgress'
import { DailyGoal } from '../library/DailyGoal'
import { aggregateBookWordCount } from '../library/book-word-count'
import type { ChapterSummary } from './chapter'
import { chapterErrorCode, chapterFailure } from './chapter-errors'
import { ChapterTitleDialog } from './ChapterTitleDialog'
import { DeleteChapter } from './DeleteChapter'

const ChapterEditorDialog = lazy(() =>
  import('./ChapterEditorDialog').then((module) => ({
    default: module.ChapterEditorDialog,
  })),
)

const copy = en.chapters

/** Mount with key=book.id so requests and unfinished titles stay book-scoped. */
export function ChapterManager({
  book,
  onBack,
}: {
  book: Book
  onBack: () => void
}) {
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState('')
  const [desktopOnly, setDesktopOnly] = useState(false)
  const [notice, setNotice] = useState('')
  const request = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const retry = useRef<HTMLButtonElement>(null)

  const load = useCallback(() => {
    const current = ++request.current
    return listChapters(book.id).then(
      (result) => {
        if (current !== request.current) return false
        setChapters(result)
        setLoaded(true)
        setFailure('')
        setDesktopOnly(false)
        setLoading(false)
        return true
      },
      (error: unknown) => {
        if (current !== request.current) return false
        setDesktopOnly(chapterErrorCode(error) === 'desktop_required')
        setFailure(
          chapterErrorCode(error) === 'not_found'
            ? copy.missingList
            : chapterFailure(error, copy.loadFailure),
        )
        setLoading(false)
        return false
      },
    )
  }, [book.id])

  useEffect(() => {
    void load()
    return () => {
      request.current += 1
    }
  }, [load])

  const bookWordCount =
    loaded && !loading && !failure
      ? aggregateBookWordCount(book.id, chapters)
      : null
  const disabled = loading || pending || !loaded || Boolean(failure)
  function operationPending(next: boolean) {
    setPending(next)
    if (next) setNotice('')
  }
  function saved(chapter: ChapterSummary, created: boolean) {
    setChapters((previous) =>
      created
        ? [...previous, chapter]
        : previous.map((item) => (item.id === chapter.id ? chapter : item)),
    )
    setNotice(
      created ? copy.created(chapter.title) : copy.renamed(chapter.title),
    )
    // Reconcile membership/order after a committed write; a failed read keeps the
    // committed row and blocks further writes until a successful retry.
    setLoading(true)
    void load()
  }

  return (
    <section className="space-y-4" aria-label={book.title}>
      <Card className="space-y-4">
        <h2 className="font-writing text-writing break-words">{book.title}</h2>
        <p className="text-secondary">
          {book.targetWordCount === null
            ? en.library.noTarget
            : en.library.wordTarget(
                new Intl.NumberFormat('en').format(book.targetWordCount),
              )}
        </p>
        <DailyGoal value={book.dailyWordGoal} />
        <p aria-label={en.library.bookWordCount} className="text-secondary">
          {bookWordCount === null
            ? en.library.wordCountUnavailable
            : en.library.savedBookWords(
                new Intl.NumberFormat('en').format(bookWordCount),
              )}
        </p>
        {book.targetWordCount !== null && bookWordCount !== null && (
          <BookProgress
            wordCount={bookWordCount}
            targetWordCount={book.targetWordCount}
          />
        )}
        <Button variant="secondary" onClick={onBack}>
          {en.library.backToLibrary}
        </Button>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 ref={heading} tabIndex={-1} className="font-writing text-writing">
          {copy.heading}
        </h2>
        <ChapterTitleDialog
          bookId={book.id}
          disabled={disabled}
          onPending={operationPending}
          onSaved={saved}
          onCommittedClose={() => heading.current?.focus()}
        />
      </div>
      <Button
        variant="ghost"
        disabled={loading || pending}
        onClick={() => {
          setLoading(true)
          void load()
        }}
      >
        {copy.refresh}
      </Button>
      <p className="text-secondary">{copy.pending}</p>
      <p role="status" className="break-words">
        {notice}
      </p>
      <div aria-busy={loading} className="space-y-4">
        {loading && <p role="status">{copy.loading}</p>}
        {failure && (
          <Card className="space-y-3">
            <p role="alert" className="text-error">
              {failure}
            </p>
            {!desktopOnly && (
              <Button
                ref={retry}
                variant="secondary"
                disabled={loading || pending}
                onClick={() => {
                  setLoading(true)
                  void load().then((success) => {
                    requestAnimationFrame(() => {
                      if (
                        document.activeElement === retry.current ||
                        document.activeElement === document.body
                      ) {
                        if (success) heading.current?.focus()
                        else retry.current?.focus()
                      }
                    })
                  })
                }}
              >
                {copy.retry}
              </Button>
            )}
          </Card>
        )}
        {loaded && !loading && !failure && chapters.length === 0 && (
          <Card>
            <p>{copy.empty}</p>
          </Card>
        )}
        {chapters.length > 0 && (
          <ol aria-label={copy.heading} className="space-y-3">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <Card
                  role="group"
                  aria-labelledby={`chapter-${chapter.id}`}
                  className="space-y-3"
                >
                  <h3
                    id={`chapter-${chapter.id}`}
                    className="font-writing text-writing break-words"
                  >
                    {chapter.title}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <Suspense
                      fallback={
                        <Button variant="secondary" disabled>
                          {copy.open}
                        </Button>
                      }
                    >
                      <ChapterEditorDialog
                        bookId={book.id}
                        chapter={chapter}
                        chapters={chapters}
                        disabled={disabled}
                        onPending={operationPending}
                        onSaved={(committed) => {
                          setChapters((previous) =>
                            previous.map((item) =>
                              item.id === committed.id ? committed : item,
                            ),
                          )
                          setNotice(copy.textSaved(committed.title))
                        }}
                      />
                    </Suspense>
                    <ChapterTitleDialog
                      bookId={book.id}
                      chapter={chapter}
                      disabled={disabled}
                      onPending={operationPending}
                      onSaved={saved}
                      onCommittedClose={() => heading.current?.focus()}
                    />
                    <DeleteChapter
                      bookId={book.id}
                      chapter={chapter}
                      disabled={disabled}
                      onPending={operationPending}
                      onCommittedClose={() => heading.current?.focus()}
                      onDeleted={(remaining, deleted) => {
                        request.current += 1
                        setChapters(remaining)
                        setNotice(copy.deleted(deleted.title))
                      }}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
